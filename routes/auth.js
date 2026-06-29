const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');

const scryptAsync = promisify(crypto.scrypt);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getHashType(storedHash) {
  const value = String(storedHash || '');
  if (value.includes(':')) {
    return 'scrypt';
  }
  if (value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$')) {
    return 'bcrypt';
  }
  return 'unknown';
}

function authDebug(message, details) {
  console.log('[AUTH_DEBUG]', message, details || '');
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hashBuffer = await scryptAsync(password, salt, 64);
  return `${salt}:${hashBuffer.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  const hashType = getHashType(storedHash);

  if (hashType === 'scrypt') {
    const [salt, expectedHash] = String(storedHash || '').split(':');
    if (!salt || !expectedHash) {
      return { valid: false, hashType, reason: 'Malformed scrypt hash.' };
    }

    const actualHashBuffer = await scryptAsync(password, salt, 64);
    const expectedHashBuffer = Buffer.from(expectedHash, 'hex');

    if (actualHashBuffer.length !== expectedHashBuffer.length) {
      return { valid: false, hashType, reason: 'Hash length mismatch.' };
    }

    return {
      valid: crypto.timingSafeEqual(actualHashBuffer, expectedHashBuffer),
      hashType,
      reason: 'Scrypt comparison completed.'
    };
  }

  if (hashType === 'bcrypt') {
    const valid = await bcrypt.compare(password, String(storedHash || ''));
    return { valid, hashType, reason: 'Bcrypt comparison completed.' };
  }

  return { valid: false, hashType, reason: 'Unsupported hash format.' };
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

module.exports = function createAuthRoutes(db) {
  const router = express.Router();

  router.post('/signup', async (req, res) => {
    const fullName = String(req.body.fullName || '').trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const confirmPassword = String(req.body.confirmPassword || '');

    if (!fullName || !email || !password || !confirmPassword) {
      authDebug('Signup rejected due to missing fields.', { email, hasFullName: Boolean(fullName) });
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password.length < 8) {
      authDebug('Signup rejected due to short password.', { email, passwordLength: password.length });
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (password !== confirmPassword) {
      authDebug('Signup rejected due to password mismatch.', { email });
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    try {
      const existing = await dbGet(db, 'SELECT id FROM users WHERE lower(trim(email)) = ?', [email]);
      if (existing) {
        authDebug('Signup rejected because email already exists.', { email, userId: existing.id });
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const userCountRow = await dbGet(db, 'SELECT COUNT(*) AS count FROM users');
      const isAdmin = Number(userCountRow.count || 0) === 0 ? 1 : 0;
      const passwordHash = await hashPassword(password);

      const insert = await dbRun(
        db,
        'INSERT INTO users (full_name, email, password_hash, is_admin) VALUES (?, ?, ?, ?)',
        [fullName, email, passwordHash, isAdmin]
      );

      const user = {
        id: insert.lastID,
        fullName,
        email,
        isAdmin: Boolean(isAdmin)
      };

      req.session.user = user;
      req.session.isAdmin = user.isAdmin;

      authDebug('Signup succeeded and user inserted.', {
        email,
        userId: user.id,
        isAdmin: user.isAdmin
      });

      return res.status(201).json({
        authenticated: true,
        user,
        message: user.isAdmin
          ? 'Account created. You are the first admin user.'
          : 'Account created successfully.'
      });
    } catch (error) {
      console.error('Signup error:', error);
      authDebug('Signup failed due to server/database error.', { email, error: error.message });
      return res.status(500).json({ error: 'Unable to create account right now.' });
    }
  });

  router.post('/login', async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      authDebug('Login rejected due to missing fields.', { email, hasPassword: Boolean(password) });
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
      authDebug('Login attempt received.', { email });

      const userRow = await dbGet(
        db,
        'SELECT id, full_name, email, password_hash, is_admin FROM users WHERE lower(trim(email)) = ?',
        [email]
      );

      if (!userRow) {
        authDebug('Login failed because user does not exist.', { email });
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const verification = await verifyPassword(password, userRow.password_hash);
      authDebug('Password verification completed.', {
        email,
        userId: userRow.id,
        hashType: verification.hashType,
        valid: verification.valid,
        reason: verification.reason
      });

      if (!verification.valid) {
        authDebug('Login failed because password comparison failed.', {
          email,
          userId: userRow.id,
          hashType: verification.hashType,
          reason: verification.reason
        });
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (verification.hashType === 'bcrypt') {
        const upgradedHash = await hashPassword(password);
        await dbRun(db, 'UPDATE users SET password_hash = ? WHERE id = ?', [upgradedHash, userRow.id]);
        authDebug('Upgraded user password hash from bcrypt to scrypt.', {
          email,
          userId: userRow.id
        });
      }

      const user = {
        id: userRow.id,
        fullName: userRow.full_name,
        email: userRow.email,
        isAdmin: Boolean(userRow.is_admin)
      };

      req.session.user = user;
      req.session.isAdmin = user.isAdmin;

      authDebug('Login succeeded and session established.', {
        email,
        userId: user.id,
        isAdmin: user.isAdmin
      });

      return res.json({ authenticated: true, user, message: 'Login successful.' });
    } catch (error) {
      console.error('Login error:', error);
      authDebug('Login failed due to server/database error.', { email, error: error.message });
      return res.status(500).json({ error: 'Unable to log in right now.' });
    }
  });

  router.get('/session', (req, res) => {
    const user = req.session && req.session.user ? req.session.user : null;
    return res.json({ authenticated: Boolean(user), user });
  });

  router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Unable to log out right now.' });
      }
      return res.json({ loggedOut: true });
    });
  });

  return router;
};
const express = require('express');
const crypto = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(crypto.scrypt);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hashBuffer = await scryptAsync(password, salt, 64);
  return `${salt}:${hashBuffer.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, expectedHash] = String(storedHash || '').split(':');
  if (!salt || !expectedHash) {
    return false;
  }

  const actualHashBuffer = await scryptAsync(password, salt, 64);
  const expectedHashBuffer = Buffer.from(expectedHash, 'hex');

  if (actualHashBuffer.length !== expectedHashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualHashBuffer, expectedHashBuffer);
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
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    try {
      const existing = await dbGet(db, 'SELECT id FROM users WHERE lower(trim(email)) = ?', [email]);
      if (existing) {
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

      return res.status(201).json({
        authenticated: true,
        user,
        message: user.isAdmin
          ? 'Account created. You are the first admin user.'
          : 'Account created successfully.'
      });
    } catch (error) {
      console.error('Signup error:', error);
      return res.status(500).json({ error: 'Unable to create account right now.' });
    }
  });

  router.post('/login', async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
      const userRow = await dbGet(
        db,
        'SELECT id, full_name, email, password_hash, is_admin FROM users WHERE lower(trim(email)) = ?',
        [email]
      );

      if (!userRow) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const validPassword = await verifyPassword(password, userRow.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const user = {
        id: userRow.id,
        fullName: userRow.full_name,
        email: userRow.email,
        isAdmin: Boolean(userRow.is_admin)
      };

      req.session.user = user;
      req.session.isAdmin = user.isAdmin;

      return res.json({ authenticated: true, user, message: 'Login successful.' });
    } catch (error) {
      console.error('Login error:', error);
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
const express = require('express');
const crypto = require('crypto');

function secureCompare(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    const maxLength = Math.max(leftBuffer.length, rightBuffer.length);
    const paddedLeft = Buffer.alloc(maxLength);
    const paddedRight = Buffer.alloc(maxLength);
    leftBuffer.copy(paddedLeft);
    rightBuffer.copy(paddedRight);
    crypto.timingSafeEqual(paddedLeft, paddedRight);
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

module.exports = function createAdminRoutes(options = {}) {
  const router = express.Router();
  const adminPassword = String(options.adminPassword || '');

  router.post('/login', (req, res) => {
    const password = String(req.body.password || '');

    if (!password) {
      return res.status(400).json({ authenticated: false, message: 'Password is required.' });
    }

    if (secureCompare(password, adminPassword)) {
      req.session.isAdmin = true;
      return res.json({ authenticated: true, message: 'Authentication successful.' });
    }

    req.session.isAdmin = false;
    return res.status(401).json({ authenticated: false, message: 'Password is incorrect.' });
  });

  router.get('/session', (req, res) => {
    const authenticated = Boolean(req.session && req.session.isAdmin);
    return res.json({ authenticated });
  });

  router.post('/logout', (req, res) => {
    req.session.isAdmin = false;
    return res.json({ loggedOut: true });
  });

  return router;
};

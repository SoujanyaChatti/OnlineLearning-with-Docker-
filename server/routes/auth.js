const express = require('express');
const { pool } = require('../db'); // Use the new db.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();


// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const result = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (!result.rows[0]) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, result.rows[0].password_hash);
    if (match) {
      const token = jwt.sign({ id: result.rows[0].id, role: result.rows[0].role }, process.env.JWT_SECRET);
      res.json({ token, role: result.rows[0].role });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/signup', async (req, res) => {
  const { email, password, name, userType } = req.body; // Match frontend key 'userType'

  // Validate required fields
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  try {
    // Check if email already exists
    const checkEmail = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Validate userType if provided
    const validRole = ['student', 'instructor', 'admin'].includes(userType) ? userType : 'student';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO Users (email, password_hash, role, name) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, hashedPassword, validRole, name]
    );

    // Generate JWT token
    const token = jwt.sign({ id: result.rows[0].id, role: validRole }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, user: result.rows[0] });
  } catch (err) {
    console.error('Signup error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router;

//require('dotenv').config({ path: '../.env' });
console.log('DATABASE_URL:', process.env.DATABASE_URL);
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const { pool } = require('./db');
pool.connect((err) => {
  if (err) console.error('Database connection error:', err.stack);
  else console.log('Connected to PostgreSQL');
});
app.set('db', pool);
const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

const coursesRouter = require('./routes/courses');
app.use('/api/courses', authenticate, coursesRouter);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const modulesRouter = require('./routes/modules');
app.use('/api/modules', modulesRouter);

const certificatesRouter = require('./routes/certificates');
app.use('/api/certificates', certificatesRouter);

const submissionsRouter = require('./routes/submissions'); // New router
app.use('/api/submissions', authenticate, submissionsRouter); // Mount under /api/submissions

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { pool };

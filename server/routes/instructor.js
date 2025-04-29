const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { rbac } = require('../middleware/rbac'); // Replace authenticate with rbac

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Instructor-specific endpoints
router.get('/courses/:id', rbac(['instructor']), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM courses WHERE instructor_id = $1', [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.delete('/courses/:id', rbac(['instructor']), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM courses WHERE id = $1 AND instructor_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found or not authorized' });
    }
    res.json({ message: 'Course deleted successfully!', course: result.rows[0] });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

module.exports = router;
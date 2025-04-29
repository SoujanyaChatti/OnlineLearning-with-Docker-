const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../db'); // Destructure pool to match original db.js export
require('dotenv').config();

router.get('/:moduleId/contents', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { moduleId } = req.params;
  try {
    // Fetch CourseContent
    const contentResult = await pool.query(
      `SELECT id, type, url, duration, order_index
       FROM CourseContent
       WHERE module_id = $1
       ORDER BY order_index`,
      [moduleId]
    );

    // Fetch Quiz for the module
    const quizResult = await pool.query(
      `SELECT id, questions, passing_score, course_id
       FROM Quizzes
       WHERE module_id = $1`,
      [moduleId]
    );

    const contents = contentResult.rows.map(row => ({
      ...row,
      questions: null,
      passing_score: null
    }));

    // Add quiz as a separate content item if it exists
    if (quizResult.rows.length > 0) {
      const quizRow = quizResult.rows[0];
      let questions = null;
      try {
        questions = typeof quizRow.questions === 'string' ? JSON.parse(quizRow.questions) : quizRow.questions;
      } catch (e) {
        console.error('Failed to parse questions JSON:', e.message);
        questions = []; // Default to empty array on parse failure
      }
      contents.push({
        id: quizRow.id,
        type: 'quiz',
        url: 'http://example.com/quiz', // Placeholder URL
        duration: null,
        order_index: 999, // High value to place at end
        questions: questions,
        passing_score: quizRow.passing_score || 70,
        course_id: quizRow.course_id
      });
    }

    console.log('Fetched contents with quizzes:', contents); // Debug log
    res.status(200).json(contents);
  } catch (err) {
    console.error('Content fetch error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
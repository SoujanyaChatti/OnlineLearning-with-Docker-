const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
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

    // Map CourseContent with prefixed IDs
    const contents = contentResult.rows.map(row => ({
      ...row,
      id: `content-${row.id}`, // Prefix to avoid conflicts
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
        questions = [];
      }
      contents.push({
        id: `quiz-${quizRow.id}`, // Prefix to avoid conflicts
        type: 'quiz',
        url: null, // Remove placeholder URL
        duration: null,
        order_index: contentResult.rows.length + 1, // Place after content
        questions: questions,
        passing_score: quizRow.passing_score || 70,
        course_id: quizRow.course_id
      });
    }

    // Sort by order_index to ensure correct display order
    const sortedContents = contents.sort((a, b) => a.order_index - b.order_index);

    console.log('Fetched contents with quizzes:', sortedContents);
    res.status(200).json(sortedContents);
  } catch (err) {
    console.error('Content fetch error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

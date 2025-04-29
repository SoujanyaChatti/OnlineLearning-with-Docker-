const express = require('express');
const { pool } = require('../db');
const router = express.Router();
const { rbac } = require('../middleware/rbac'); // Import RBAC middleware

router.get('/count', rbac(['student']), async (req, res) => {
  const { enrollmentId, quizId } = req.query;
  console.log('Fetching attempt count:', { enrollmentId, quizId });

  try {
    if (!enrollmentId || !quizId) {
      return res.status(400).json({ error: 'Missing enrollmentId or quizId' });
    }

    const result = await pool.query(
      'SELECT COUNT(*) as attempt_count FROM QuizSubmissions WHERE enrollment_id = $1 AND quiz_id = $2',
      [enrollmentId, quizId]
    );
    const attemptCount = parseInt(result.rows[0].attempt_count);
    console.log('Fetched attempt count:', attemptCount);
    res.status(200).json({ attemptCount });
  } catch (err) {
    console.error('Attempt count fetch error:', err.stack);
    res.status(500).json({ error: 'Failed to fetch attempt count', details: err.message });
  }
});

router.post('/', rbac(['student']), async (req, res) => {
  const { enrollmentId, quizId, userId, score } = req.body;
  console.log('Received submission:', { enrollmentId, quizId, userId, score });

  try {
    if (!enrollmentId || !quizId || !userId || score === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const attemptResult = await pool.query(
      'SELECT COUNT(*) as attempt_count FROM QuizSubmissions WHERE enrollment_id = $1 AND quiz_id = $2',
      [enrollmentId, quizId]
    );
    const attemptCount = parseInt(attemptResult.rows[0].attempt_count) + 1;
    const maxAttempts = 3;

    if (attemptCount > maxAttempts) {
      return res.status(400).json({ error: `Maximum ${maxAttempts} attempt limit reached` });
    }

    await pool.query(
      'INSERT INTO QuizSubmissions (enrollment_id, quiz_id, user_id, score, attempts, submitted_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [enrollmentId, quizId, userId, score, attemptCount]
    );

    await pool.query('UPDATE Enrollments SET progress = $1 WHERE id = $2', [score, enrollmentId]);

    res.status(200).json({
      message: 'Submission recorded',
      attemptCount,
      progress: score,
    });
  } catch (err) {
    console.error('Submission error:', err.stack);
    res.status(500).json({ error: 'Failed to record submission', details: err.message });
  }
});

router.get('/max-score', rbac(['student']), async (req, res) => {
  const { quizId } = req.query;
  console.log('Fetching max score for quizId:', quizId);

  try {
    if (!quizId) {
      return res.status(400).json({ error: 'Missing quizId' });
    }

    const result = await pool.query(
      'SELECT passing_score FROM Quizzes WHERE id = $1',
      [quizId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    const maxScore = result.rows[0].passing_score;
    console.log('Fetched max score:', maxScore);
    res.status(200).json({ maxScore });
  } catch (err) {
    console.error('Max score fetch error:', err.stack);
    res.status(500).json({ error: 'Failed to fetch max score', details: err.message });
  }
});

module.exports = router;
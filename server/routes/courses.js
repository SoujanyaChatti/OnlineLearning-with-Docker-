const express = require('express');
const { pool } = require('../db');
const router = express.Router();
const jwt = require('jsonwebtoken'); // Add this import
const { rbac } = require('../middleware/rbac'); // Import RBAC middleware

pool.query(`
  CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create Course (Instructor only)
router.post('/', rbac(['instructor']), async (req, res) => {
  const { title, description, category, difficulty, instructor_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Courses (title, description, category, difficulty, instructor_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [title, description, category, difficulty, instructor_id]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Course error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Module
router.post('/modules', rbac(['instructor']), async (req, res) => {
  const { course_id, title, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Modules (course_id, title, description) VALUES ($1, $2, $3) RETURNING id',
      [course_id, title, description]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Module error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add Course Content
router.post('/course-content', rbac(['instructor']), async (req, res) => {
  const { module_id, type, url, duration } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO CourseContent (module_id, type, url, duration) VALUES ($1, $2, $3, $4) RETURNING id',
      [module_id, type, url, duration]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Content error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Enroll in a course (Student only)
router.post('/enrollments', rbac(['student']), async (req, res) => {
  const { course_id, user_id } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.id !== user_id) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO Enrollments (course_id, user_id, progress) VALUES ($1, $2, $3) RETURNING id',
      [course_id, user_id, 0]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Enrollment error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add Quiz
router.post('/quizzes', rbac(['instructor']), async (req, res) => {
  console.log('Raw questions input:', req.body.questions);
  const { module_id, questions, passing_score } = req.body;
  try {
    const questionsJson = JSON.stringify(questions); // Explicitly convert to JSON string
    const result = await pool.query(
      'INSERT INTO Quizzes (module_id, questions, passing_score) VALUES ($1, $2, $3) RETURNING id',
      [module_id, questionsJson, passing_score]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Quiz error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});
router.put('/:moduleId/quizzes', rbac(['instructor']), async (req, res) => {
  const { moduleId } = req.params;
  const { questions, passing_score } = req.body;
  try {
    const result = await pool.query(
      'UPDATE Quizzes SET questions = $1, passing_score = $2 WHERE module_id = $3 RETURNING *',
      [JSON.stringify(questions), passing_score, moduleId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Quiz not found for this module' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update quiz error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});
// Update Progress
router.post('/enrollments/:id/progress', rbac(['student']), async (req, res) => {
  const { id } = req.params;
  const { moduleId, contentId } = req.body;
  try {
    const courseResult = await pool.query('SELECT course_id FROM Enrollments WHERE id = $1', [id]);
    const courseId = courseResult.rows[0].course_id;

    const totalDurationResult = await pool.query(
      `SELECT COALESCE(SUM(
        CASE 
          WHEN cc.duration LIKE '%m' THEN CAST(SPLIT_PART(cc.duration, 'm', 1) AS INTEGER) * 60
          WHEN cc.duration LIKE '%s' THEN CAST(SPLIT_PART(cc.duration, 's', 1) AS INTEGER)
          ELSE 0
        END
      ), 0) as total_seconds 
      FROM Modules m 
      JOIN CourseContent cc ON m.id = cc.module_id 
      WHERE m.course_id = $1`,
      [courseId]
    );
    const totalSeconds = totalDurationResult.rows[0].total_seconds || 1;

    const completedResult = await pool.query(
      `SELECT COALESCE(SUM(
        CASE 
          WHEN cc.duration LIKE '%m' THEN CAST(SPLIT_PART(cc.duration, 'm', 1) AS INTEGER) * 60
          WHEN cc.duration LIKE '%s' THEN CAST(SPLIT_PART(cc.duration, 's', 1) AS INTEGER)
          ELSE 0
        END
      ), 0) as completed_seconds 
      FROM CourseContent cc 
      WHERE cc.module_id = $1 AND cc.id <= $2`,
      [moduleId, contentId]
    );
    const completedSeconds = completedResult.rows[0].completed_seconds || 0;

    const progress = (completedSeconds / totalSeconds) * 100;
    await pool.query('UPDATE Enrollments SET progress = $1 WHERE id = $2', [progress, id]);
    res.status(200).json({ message: 'Progress updated', progress });
  } catch (err) {
    console.error('Progress error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, title, description FROM Courses');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Courses fetch error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/course-content/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, module_id, type, url, duration, order_index FROM CourseContent WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Content fetch error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/enrollments', async (req, res) => {
  const queryUserId = req.query.user_id ? parseInt(req.query.user_id) : 1; // Hardcode for testing
  try {
    const result = await pool.query(
      `SELECT e.id, e.course_id, e.progress, c.title
       FROM Enrollments e
       JOIN Courses c ON e.course_id = c.id
       WHERE e.user_id = $1`,
      [queryUserId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Enrollment fetch error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/enrollments', rbac(['student']), async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { course_id } = req.body;
  if (!course_id) return res.status(400).json({ error: 'Course ID is required' });

  try {
    const result = await pool.query(
      'INSERT INTO Enrollments (user_id, course_id, progress) VALUES ($1, $2, 0) RETURNING *',
      [userId, course_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Enrollment DB error:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/modules', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, title, description FROM Modules WHERE course_id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No modules found' });
    }
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Modules fetch error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/modules/:id/content', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, module_id, type, url, duration, order_index FROM CourseContent WHERE module_id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No content found' });
    }
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Content fetch error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/recommend-by-interest', async (req, res) => {
  const { user_id, categories, limit = 3 } = req.query;
  console.log('Received recommend-by-interest request:', { user_id, categories, limit });

  try {
    const userId = parseInt(user_id, 10);
    if (isNaN(userId)) throw new Error('Invalid user_id');
    const catArray = categories ? categories.split(',') : [];
    console.log('Parsed categories:', catArray);
    const limitNum = parseInt(limit, 10) || 3;

    const enrolledResult = await pool.query('SELECT course_id FROM Enrollments WHERE user_id = $1', [userId]);
    const enrolledIds = enrolledResult.rows.map((row) => row.course_id);
    console.log('Enrolled course IDs:', enrolledIds);

    const query = `
      SELECT id, title, category, difficulty, rating
      FROM Courses
      WHERE category = ANY($1)
      LIMIT $2
    `;
    const values = [catArray, limitNum];
    const result = await pool.query(query, values);
    console.log('Recommended courses query result:', result.rows);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error in recommend-by-interest:', err.stack);
    res.status(500).json({ error: 'Failed to fetch recommendations', details: err.message });
  }
});

// Similarly, update /recent and /top-rated
router.get('/recent', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, category, difficulty, rating, created_at FROM Courses ORDER BY created_at DESC LIMIT 5'
    );
    console.log('Recent courses query result:', result.rows);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Recent courses error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/top-rated', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, category, difficulty, rating FROM Courses ORDER BY rating DESC LIMIT 5'
    );
    console.log('Top rated courses query result:', result.rows);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Top rated courses error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, title, description FROM Courses WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Course fetch error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/deadlines', async (req, res) => {
  const userId = req.query.user_id ? parseInt(req.query.user_id) : req.user.id;
  try {
    const result = await pool.query(
      `SELECT q.title, q.submitted_at + INTERVAL '7 days' AS deadline
       FROM QuizSubmissions q
       WHERE q.user_id = $1`,
      [userId]
    );
    res.status(200).json(result.rows.map((row) => ({ title: row.title, date: row.deadline })));
  } catch (err) {
    console.error('Deadlines error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/recommended', async (req, res) => {
  const userId = req.query.user_id ? parseInt(req.query.user_id) : req.user.id;
  try {
    const result = await pool.query(
      `SELECT c.*
       FROM Courses c
       LEFT JOIN Enrollments e ON c.id = e.course_id AND e.user_id = $1
       WHERE e.course_id IS NULL
       ORDER BY c.rating DESC
       LIMIT 5`,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Recommended courses error:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Add this after the existing router.get('/recommended', ...)
// Replace the existing router.get('/:id/rating', ...)
router.get('/:id/rating', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT AVG(r.rating)::FLOAT AS rating
       FROM ratings r
       WHERE r.course_id = $1`,
      [id]
    );
    const averageRating = result.rows[0].rating || 0;
    console.log('Calculated average rating:', averageRating); // Debug log
    res.json({ rating: averageRating });
  } catch (err) {
    console.error('Rating fetch error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/rate', rbac(['student']), async (req, res) => {
  const { id } = req.params;
  const { userId, rating } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const existingRating = await pool.query(
      'SELECT * FROM ratings WHERE course_id = $1 AND user_id = $2',
      [id, userId]
    );
    if (existingRating.rows.length > 0) {
      await pool.query(
        'UPDATE ratings SET rating = $1, created_at = CURRENT_TIMESTAMP WHERE course_id = $2 AND user_id = $3',
        [rating, id, userId]
      );
    } else {
      await pool.query(
        'INSERT INTO ratings (course_id, user_id, rating) VALUES ($1, $2, $3)',
        [id, userId, rating]
      );
    }

    const result = await pool.query(
      `SELECT AVG(r.rating) AS average_rating
       FROM ratings r
       WHERE r.course_id = $1`,
      [id]
    );
    const averageRating = result.rows[0].average_rating || 0;

    await pool.query(
      'UPDATE courses SET rating = $1 WHERE id = $2',
      [averageRating, id]
    );

    res.json({ message: 'Rating submitted successfully!', averageRating });
  } catch (err) {
    console.error('Rating submission error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

router.post('/create', rbac(['instructor']), async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const userId = decoded.id;
  const role = decoded.role;
  if (!role || role !== 'instructor') {
    console.log('Role check failed:', role);
    return res.status(403).json({ error: 'Unauthorized: Instructor role required' });
  }

  const { title, description, category, difficulty, modules } = req.body;

  if (!title || !description || !category || !difficulty || !modules || !Array.isArray(modules)) {
    return res.status(400).json({ error: 'Missing or invalid course data' });
  }

  try {
    await pool.query('BEGIN');

    const courseResult = await pool.query(
      `INSERT INTO Courses (title, description, category, difficulty, instructor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id`,
      [title.trim(), description, category, difficulty, userId]
    );
    const courseId = courseResult.rows[0].id;

    for (const [index, module] of modules.entries()) {
      console.log(`Validating module ${index}:`, module);
      if (!module.title || typeof module.order_index !== 'number' || module.order_index < 1) {
        throw new Error(`Invalid module data at index ${index}: title or order_index (must be >= 1) missing/invalid`);
      }
      const moduleResult = await pool.query(
        `INSERT INTO Modules (course_id, title, description, order_index)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [courseId, module.title, module.description || '', module.order_index]
      );
      const moduleId = moduleResult.rows[0].id;

      if (module.contents && Array.isArray(module.contents)) {
        for (const [cIndex, content] of module.contents.entries()) {
          if (!content.type || !isValidUrl(content.url)) {
            throw new Error(`Invalid content URL at module ${index}, content ${cIndex}`);
          }
          await pool.query(
            `INSERT INTO CourseContent (module_id, type, url, duration, order_index)
             VALUES ($1, $2, $3, $4, $5)`,
            [moduleId, content.type, content.url, content.duration || null, content.order_index || 0]
          );
        }
      } else if (module.contents !== undefined) {
        throw new Error(`Invalid contents array at module ${index}`);
      }

      if (module.quiz) {
        if (!module.quiz.passing_score || !Array.isArray(module.quiz.questions)) {
          throw new Error(`Invalid quiz data at module ${index}`);
        }
        await pool.query(
          `INSERT INTO Quizzes (module_id, course_id, questions, passing_score)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (module_id) DO UPDATE
           SET questions = EXCLUDED.questions, passing_score = EXCLUDED.passing_score`,
          [moduleId, courseId, JSON.stringify(module.quiz.questions), module.quiz.passing_score]
        );
      } else if (module.quiz !== undefined) {
        throw new Error(`Invalid quiz object at module ${index}`);
      }
    }

    await pool.query('COMMIT');
    res.status(201).json({ message: 'Course created successfully', courseId });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Course creation error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Get courses (filtered by instructor if authenticated)
router.get('/', rbac(['instructor', 'student', 'admin']), async (req, res) => {
  console.log('Received GET /api/courses request, token:', req.headers.authorization);
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('No token provided, access denied');
    return res.status(401).json({ error: 'No token provided' });
  }

  let decoded;
  try {
    console.log('Attempting to verify token with JWT_SECRET:', process.env.JWT_SECRET);
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token successfully:', decoded);
  } catch (err) {
    console.error('Token verification error:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }

  const userId = decoded.id;
  console.log('Fetching courses for userId:', userId);
  try {
    const result = await pool.query('SELECT * FROM Courses WHERE instructor_id = $1', [userId]);
    console.log('Raw query:', `SELECT * FROM Courses WHERE instructor_id = ${userId}`);
    console.log('Query SQL:', result.command, 'Rows:', result.rows.map((row) => ({ id: row.id, instructor_id: row.instructor_id, title: row.title })));
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Courses fetch error:', err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add this after the last existing route (e.g., after '/recommended')
// Replace the existing router.get('/:id/forum-posts', ...)
router.get('/:id/forum-posts', rbac(['student', 'instructor', 'admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT fp.id, fp.course_id, fp.user_id, fp.content, fp.upvotes, fp.created_at,
              COALESCE(u.name, 'Anonymous') AS username
       FROM ForumPosts fp
       LEFT JOIN Users u ON fp.user_id = u.id
       WHERE fp.course_id = $1
       ORDER BY fp.created_at DESC`,
      [id]
    );
    console.log(`Fetched forum posts for course ${id}:`, result.rows); // Debug log
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Forum posts fetch error:', {
      message: err.message,
      stack: err.stack,
      query: 'SELECT ... FROM ForumPosts fp LEFT JOIN Users u ...',
      params: [id]
    });
    res.status(500).json({ error: 'Failed to fetch forum posts', details: err.message });
  }
});

// Add this after the existing router.get('/:id/forum-posts', ...)
router.post('/:id/forum-posts', rbac(['student', 'instructor', 'admin']), async (req, res) => {
  const { id } = req.params;
  const { userId, content } = req.body;
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO ForumPosts (course_id, user_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [id, userId, content]
    );
    const newPost = result.rows[0];
    const userResult = await pool.query(
      `SELECT name AS username FROM Users WHERE id = $1`,
      [userId]
    );
    newPost.username = userResult.rows[0]?.name || 'Anonymous';
    console.log('New post created:', newPost);
    res.status(201).json(newPost);
  } catch (err) {
    console.error('Post creation error:', err.stack);
    res.status(500).json({ error: 'Failed to create post', details: err.message });
  }
});

// Add this after the existing router.post('/:id/forum-posts', ...)
// Replace the existing router.patch('/:courseId/forum-posts/:postId/upvote', ...)
router.patch('/:courseId/forum-posts/:postId/upvote', rbac(['student', 'instructor', 'admin']), async (req, res) => {
  const { courseId, postId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    // Check if user has already voted
    const voteCheck = await pool.query(
      `SELECT 1 FROM UserVotes WHERE user_id = $1 AND post_id = $2`,
      [userId, postId]
    );
    if (voteCheck.rowCount > 0) {
      return res.status(400).json({ error: 'You have already voted on this post' });
    }

    // Proceed with upvote if no prior vote
    const result = await pool.query(
      `UPDATE ForumPosts SET upvotes = upvotes + 1 WHERE id = $1 AND course_id = $2 RETURNING *`,
      [postId, courseId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const updatedPost = result.rows[0];
    await pool.query(
      `INSERT INTO UserVotes (user_id, post_id) VALUES ($1, $2)`,
      [userId, postId]
    );
    const userResult = await pool.query(
      `SELECT name AS username FROM Users WHERE id = $1`,
      [updatedPost.user_id]
    );
    updatedPost.username = userResult.rows[0]?.name || 'Anonymous';
    console.log('Post upvoted:', updatedPost);
    res.status(200).json(updatedPost);
  } catch (err) {
    console.error('Upvote error:', err.stack);
    res.status(500).json({ error: 'Failed to upvote', details: err.message });
  }
});

router.get('/instructor/:id', rbac(['instructor']), async (req, res) => {
  const { id } = req.params;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT c.id, c.title, c.description, c.category, c.difficulty 
       FROM Courses c 
       WHERE c.instructor_id = $1`,
      [id]
    );
    console.log(`Fetched courses for instructor ${id}:`, result.rows);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching instructor courses:', err.stack);
    res.status(500).json({ error: 'Failed to fetch courses', message: err.message });
  }
});


router.delete('/:id', rbac(['instructor']), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM public.courses WHERE id = $1 AND instructor_id = $2', [req.params.id, req.user.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Course not found or not owned by you' });
    }
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err.stack); // Enhanced logging
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});
module.exports = router;

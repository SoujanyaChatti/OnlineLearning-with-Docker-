const express = require('express');
const router = express.Router();
const pdfkit = require('pdfkit');

const { authenticateToken } = require('../middleware/rbac');

router.get('/', authenticateToken, async (req, res) => {
  const { user_id, course_id } = req.query;

  console.log('Request received:', { user_id, course_id, user: req.user });

  try {
    // Validate input
    if (!user_id || !course_id) {
      console.log('Validation failed:', { user_id, course_id });
      return res.status(400).json({ error: 'user_id and course_id are required' });
    }

    // Get the authenticated user ID from the token for security
    const authUserId = req.user.id;
    console.log('Authenticated user ID:', authUserId);
    if (authUserId.toString() !== user_id) {
      console.log('Unauthorized access attempt:', { authUserId, user_id });
      return res.status(403).json({ error: 'Unauthorized access to another user\'s certificate' });
    }

    // Database query using PostgreSQL
    const db = req.app.get('db');
    if (!db) {
      console.log('Database not available');
      throw new Error('Database connection not available');
    }

    console.log('Querying user:', { user_id: parseInt(user_id) });
    const userResult = await db.query('SELECT name FROM users WHERE id = $1', [parseInt(user_id)]);
    console.log('User result:', userResult.rows);
    const userName = userResult.rows[0]?.name || user_id; // Fallback to user_id if name not found

    console.log('Querying enrollment:', { user_id: parseInt(user_id), course_id: parseInt(course_id) });
    const enrollment = await db.query(
      'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2 AND progress = 100',
      [parseInt(user_id), parseInt(course_id)]
    );
    console.log('Enrollment result:', enrollment.rows);
    if (enrollment.rows.length === 0) {
      return res.status(403).json({ error: 'Course not completed or unauthorized' });
    }

    console.log('Querying course:', { course_id: parseInt(course_id) });
    const course = await db.query('SELECT * FROM courses WHERE id = $1', [parseInt(course_id)]);
    console.log('Course result:', course.rows);
    if (course.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Generate certificate PDF
    const doc = new pdfkit({ size: 'A4', margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      console.log('PDF generated, sending response');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=certificate_${course_id}_${user_id}_${Date.now()}.pdf`);
      res.send(pdfData);
    });

    // Certificate design
    console.log('Starting PDF design');
    doc.fontSize(30).text('Certificate of Completion', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(20).text(`Awarded to: ${userName}`, { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(20).text(`For Completing: ${course.rows[0].title}`, { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(15).text(`Date of Completion: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(12).text('This certifies that the above individual has successfully completed the course with full proficiency.', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text('Issued by: Your Learning Platform', { align: 'center' });
    doc.end();
  } catch (err) {
    console.error('Certificate generation error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to generate certificate', details: err.message });
  }
});

module.exports = router;
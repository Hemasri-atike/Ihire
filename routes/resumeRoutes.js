import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// GET resume
router.get('/resume', async (req, res) => {
  try {
    const candidateId = 1; // TODO: replace with authenticated user ID

    const [rows] = await pool.query(
      'SELECT resume FROM candidate_resume WHERE candidate_id = ?',
      [candidateId]
    );

    if (rows.length === 0) {
      // Return empty structured resume if not found
      return res.json({
        personalInfo: { name: '', email: '', phone: '', location: '' },
        education: [],
        workExperience: [],
        skills: [],
        certifications: [],
      });
    }

    // Parse resume JSON string if stored as string
    const resume = typeof rows[0].resume === 'string'
      ? JSON.parse(rows[0].resume)
      : rows[0].resume;

    res.json(resume);
  } catch (err) {
    console.error('GET /resume error:', err);
    res.status(500).json({ error: 'Failed to fetch resume', details: err.message });
  }
});

// PUT resume (create or update)
router.put('/resume', async (req, res) => {
  try {
    const candidateId = 1; // TODO: replace with authenticated user ID
    const resumeData = req.body;

    if (!resumeData || typeof resumeData !== 'object') {
      return res.status(400).json({ error: 'Invalid resume data' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM candidate_resume WHERE candidate_id = ?',
      [candidateId]
    );

    if (rows.length > 0) {
      // Update existing resume
      await pool.query(
        'UPDATE candidate_resume SET resume = ? WHERE candidate_id = ?',
        [JSON.stringify(resumeData), candidateId]
      );
    } else {
      // Insert new resume
      await pool.query(
        'INSERT INTO candidate_resume (candidate_id, resume) VALUES (?, ?)',
        [candidateId, JSON.stringify(resumeData)]
      );
    }

    res.json(resumeData);
  } catch (err) {
    console.error('PUT /resume error:', err);
    res.status(500).json({ error: 'Failed to update resume', details: err.message });
  }
});

export default router;

import { randomBytes } from 'crypto';
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import { sendInviteEmail } from '../utils/services/mailService.js';



export const createInvite = async (req, res) => {
  const { email, role } = req.body;
  const { id: created_by, company_id, role: userRole } = req.user;
  console.log('createInvite - User:', { created_by, company_id, userRole });
  console.log('createInvite - Request Body:', { email, role });

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (!role || !['admin', 'recruiter', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (!['owner', 'admin', 'recruiter', 'viewer' ].includes(userRole)) {
    return res.status(403).json({ error: 'Only owners or admins can create invites' });
  }

  try {
    // Changed $1 to ? for MySQL
    const [company] = await pool.query('SELECT id, name FROM companies WHERE id = ?', [company_id]);
    if (!company.length) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry

    // Changed $1, $2, etc. to ? for MySQL
    await pool.query(
      `INSERT INTO invites (company_id, email, token_hash, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [company_id, email, tokenHash, expiresAt, created_by]
    );

    const emailSent = await sendInviteEmail(email, token, company[0].name);
    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send invite email' });
    }

    res.status(201).json({ message: 'Invite created and email sent successfully' });
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

export const validateInvite = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    // Find invite by token
    const [invites] = await pool.query(
      `SELECT i.id, i.company_id, i.email, i.used, i.expires_at, i.token_hash, c.name AS company_name
       FROM invites i
       JOIN companies c ON i.company_id = c.id
       WHERE i.used = FALSE AND i.expires_at > NOW()`,
      []
    );

    // Find matching invite by comparing token hash
    let validInvite = null;
    for (const invite of invites) {
      if (await bcrypt.compare(token, invite.token_hash)) {
        validInvite = invite;
        break;
      }
    }

    if (!validInvite) {
      return res.status(400).json({ error: 'Invalid, used, or expired token' });
    }

    res.status(200).json({
      email: validInvite.email,
      company_id: validInvite.company_id,
      company_name: validInvite.company_name,
    });
  } catch (error) {
    console.error('Error validating invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const acceptInvite = async (req, res) => {
  const { token } = req.body;
  const { id: employer_id, email } = req.user;

  // Manual validation
  if (!token || token.trim() === '') {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    // Find invite by token
    const [invites] = await pool.query(
      `SELECT i.id, i.company_id, i.email, i.used, i.expires_at, i.token_hash
       FROM invites i
       WHERE i.used = FALSE AND i.expires_at > NOW()`,
      []
    );

    // Find matching invite by comparing token hash
    let validInvite = null;
    for (const invite of invites) {
      if (await bcrypt.compare(token, invite.token_hash)) {
        validInvite = invite;
        break;
      }
    }

    if (!validInvite) {
      return res.status(400).json({ error: 'Invalid, used, or expired token' });
    }

    // Verify email matches invite
    if (validInvite.email !== email) {
      return res.status(403).json({ error: 'Invite is not for this email' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Update invite as used
      await connection.query(
        `UPDATE invites
         SET used = TRUE, used_by = $1, used_at = NOW()
         WHERE id = $2`,
        [employer_id, validInvite.id]
      );

      // Update employer's company_id
      await connection.query(
        `UPDATE employers
         SET company_id = $1
         WHERE user_id = $2`,
        [validInvite.company_id, employer_id]
      );

      await connection.commit();
      res.status(200).json({ message: 'Invite accepted successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
import { randomBytes } from 'crypto';
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import { sendInviteEmail } from '../utils/services/mailService.js';



export const createInvite = async (req, res) => {
  const { email, role } = req.body;
  console.log("role",role)
  const { id: created_by, company_id, role: userRole } = req.user;
console.log("userRole",userRole)
  console.log('CreateInvite called:', { email, role, created_by, company_id });

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.log('Invalid email:', email);
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (!role || !['admin', 'recruiter', 'viewer'].includes(role)) {
    console.log('Invalid role:', role);
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (!['owner', 'admin' ,`recruiter`].includes(userRole)) {
    console.log('Unauthorized user role:', userRole);
    return res.status(403).json({ error: 'Only owners or admins can create invites' });
  }

  try {
    const [company] = await pool.query('SELECT id, name FROM companies WHERE id = ?', [company_id]);
    if (!company.length) {
      console.log('Company not found:', company_id);
      return res.status(404).json({ error: 'Company not found' });
    }

    const token = randomBytes(32).toString('hex');
    console.log("token",token )
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [result] = await pool.query(
      `INSERT INTO invites (company_id, email, token_hash, expires_at, created_by, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [company_id, email, tokenHash, expiresAt, created_by, role]
    );
    console.log('Invite created:', { id: result.insertId, email, token, company_id, role });

    const inviteLink = `http://localhost:3000/api/invites/accept?token=${encodeURIComponent(token)}`;
    const emailSent = await sendInviteEmail(email, inviteLink, company[0].name, role);
    if (!emailSent) {
      console.log('Failed to send invite email to:', email);
      return res.status(500).json({ error: 'Failed to send invite email' });
    }

    console.log('Invite link sent:', inviteLink);
    res.status(201).json({ message: 'Invite created and email sent successfully', inviteId: result.insertId, token });
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

export const validateInvite = async (req, res) => {
  const { token } = req.query;

  console.log('ValidateInvite called with token:', token);

  if (!token || token.trim() === '') {
    console.log('Token missing or empty');
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const [invites] = await pool.query(
      `SELECT i.id, i.company_id, i.email, i.used, i.expires_at, i.token_hash, i.role, c.name AS company_name
       FROM invites i
       JOIN companies c ON i.company_id = c.id
       WHERE i.used = FALSE AND i.expires_at > NOW()`,
      []
    );
    console.log('Found invites:', invites.length);

    let validInvite = null;
    for (const invite of invites) {
      if (await bcrypt.compare(token, invite.token_hash)) {
        validInvite = invite;
        break;
      }
    }

    if (!validInvite) {
      console.log('No matching invite found for token');
      return res.status(400).json({ error: 'Invalid, used, or expired token' });
    }

    console.log('Valid invite found:', { id: validInvite.id, email: validInvite.email, company_id: validInvite.company_id });
    res.status(200).json({
      email: validInvite.email,
      company_name: validInvite.company_name,
      role: validInvite.role,
      company_id: validInvite.company_id,
    });
  } catch (error) {
    console.error('Error validating invite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const acceptInvite = async (req, res) => {
  const { token } = req.body;
  const { id: recruiter_id, email } = req.user;

  console.log('AcceptInvite called with token:', token, 'user:', { recruiter_id, email });

  if (!token || token.trim() === '') {
    console.log('Token missing or empty');
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const [invites] = await pool.query(
      `SELECT i.id, i.company_id, i.email, i.used, i.expires_at, i.token_hash, i.role
       FROM invites i
       WHERE i.used = FALSE AND i.expires_at > NOW()`,
      []
    );
    console.log('Found invites:', invites.length, 'details:', invites.map(i => ({
      id: i.id,
      email: i.email,
      used: i.used,
      expires_at: i.expires_at,
    })));

    let validInvite = null;
    for (const invite of invites) {
      console.log('Comparing token with invite ID:', invite.id);
      if (await bcrypt.compare(token, invite.token_hash)) {
        validInvite = invite;
        break;
      }
    }

    if (!validInvite) {
      console.log('No matching invite found for token');
      return res.status(400).json({ error: 'Invalid, used, or expired token' });
    }

    if (validInvite.email !== email) {
      console.log('Email mismatch:', { inviteEmail: validInvite.email, userEmail: email });
      return res.status(403).json({ error: 'Invite is not for this email' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE invites
         SET used = TRUE, used_by = ?, used_at = NOW()
         WHERE id = ?`,
        [recruiter_id, validInvite.id]
      );

      await connection.query(
        `UPDATE recruiters
         SET company_id = ?, role = ?
         WHERE id = ?`,
        [validInvite.company_id, validInvite.role, recruiter_id]
      );

      await connection.commit();
      console.log('Invite accepted successfully for user:', recruiter_id);
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

export const registerWithInvite = async (req, res) => {
   const { token, name, password, designation } = req.body;

  console.log('InviteRegister called with token:', token, 'name:', name);

  if (!token || !name || !password) {
    console.log('Missing required fields');
    return res.status(400).json({ error: 'Token, name, and password are required' });
  }

  try {
    const [invites] = await pool.query(
      `SELECT i.id, i.company_id, i.email, i.used, i.expires_at, i.token_hash, i.role
       FROM invites i
       WHERE i.used = FALSE AND i.expires_at > NOW()`,
      []
    );
    console.log('Found invites:', invites.length);

    let validInvite = null;
    for (const invite of invites) {
      if (await bcrypt.compare(token, invite.token_hash)) {
        validInvite = invite;
        break;
      }
    }

    if (!validInvite) {
      console.log('No matching invite found for token');
      return res.status(400).json({ error: 'Invalid, used, or expired token' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO recruiters (name, email, password, company_id, role, designation, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          validInvite.email,
          passwordHash,
          validInvite.company_id,
          validInvite.role,
          designation || null,
          true,
        ]
      );

      const newRecruiterId = result.insertId;

      await connection.query(
        `UPDATE invites
         SET used = TRUE, used_by = ?, used_at = NOW()
         WHERE id = ?`,
        [newRecruiterId, validInvite.id]
      );

      // Generate JWT auth token
      const authToken = jwt.sign(
        { id: newRecruiterId, email: validInvite.email, role: validInvite.role, company_id: validInvite.company_id },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '7d' }
      );

      await connection.commit();
      console.log('New recruiter created:', {
        id: newRecruiterId,
        email: validInvite.email,
        company_id: validInvite.company_id,
        role: validInvite.role,
      });
      res.status(201).json({ message: 'Registration successful', authToken });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export const getCompanyInvites = async (req, res) => {
  let connection;
  try {
    const { company_id: companyId } = req.user; 
    if (!companyId) {
      return res.status(401).json({ error: 'Company not found' });
    }

    connection = await pool.getConnection();

    const [invites] = await connection.execute(
      `SELECT 
          ci.id, 
          ci.email, 
          ci.created_at, 
          ci.used,
          r.name AS invited_by_name
       FROM invites ci
       JOIN recruiters r ON ci.created_by = r.id
       WHERE ci.company_id = ?
       ORDER BY ci.created_at DESC`,
      [companyId]
    );

    res.status(200).json({
      message: 'Invites fetched successfully',
      invites,
      count: invites.length,
    });
  } catch (error) {
    console.error('Get company invites error:', error);
    res.status(500).json({ error: 'Something went wrong', details: error.message });
  } finally {
    if (connection) connection.release();
  }
};


export const deleteCompanyInvite = async (req, res) => {
  let connection;
  try {
    const { inviteId } = req.params;
    const { company_id: companyId } = req.user;

    if (!companyId) {
      return res.status(401).json({ error: "Company not found" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [invite] = await connection.execute(
      "SELECT email FROM invites WHERE id = ? AND company_id = ?",
      [inviteId, companyId]
    );

    if (invite.length === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ error: "Invite not found or unauthorized" });
    }

    const invitedEmail = invite[0].email;

    await connection.execute("DELETE FROM invites WHERE id = ?", [inviteId]);


    await connection.execute(
      "DELETE FROM recruiters WHERE email = ? AND company_id = ?",
      [invitedEmail, companyId]
    );

    await connection.commit();

    res
      .status(200)
      .json({ message: "Invite and associated recruiter deleted successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Delete invite error:", error);
    res
      .status(500)
      .json({ error: "Something went wrong", details: error.message });
  } finally {
    if (connection) connection.release();
  }
};

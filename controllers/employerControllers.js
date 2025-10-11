import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import upload from '../middleware/upload.js';

const validateUser = (body) => {
  const { name, email, password, designation } = body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return 'Name is required';
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Valid email is required';
  }
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  if (!designation || typeof designation !== 'string' || designation.trim() === '') {
    return 'Designation is required';
  }
  return null;
};

const validateCompany = (body) => {
  const { userId, name } = body;
  const parsedUserId = Number(userId); // Convert userId to number
  if (!userId || isNaN(parsedUserId)) {
    return 'Valid userId is required';
  }
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return 'Company name is required';
  }
  if (body.website && !/^https?:\/\/.+/.test(body.website)) {
    return 'Valid website URL is required';
  }
  if (body.video_url && !/^https?:\/\/.+/.test(body.video_url)) {
    return 'Valid video URL is required';
  }
  if (body.size && !['1-10', '11-50', '51-200', '200+'].includes(body.size)) {
    return 'Invalid company size';
  }
  return null;
};

export const employerRegister = async (req, res) => {
  let connection;
  try {
    const error = validateUser(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const { name, email, password, designation } = req.body;
    connection = await pool.getConnection();

    const [existingUser] = await connection.query(
      'SELECT * FROM employers WHERE email = ?',
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await connection.query(
      'INSERT INTO employers (name, email, password, designation) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, designation]
    );

    const userId = result.insertId;
    const [userRows] = await connection.query('SELECT * FROM employers WHERE id = ?', [userId]);
    const user = userRows[0];
 
    const token = jwt.sign(     
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      message: 'Employer registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        designation: user.designation,
      },
      token,
    });
  } catch (error) {
    console.error('Employer register error:', error);
    res.status(500).json({ error: 'Something went wrong', details: error.message });
  } finally {
    if (connection) connection.release();
  }
};

export const employerCompanyRegister = [
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  async (req, res) => {
    let connection;
    try {
      console.log('Request body:', req.body); // Debug: Log request body
      console.log('Files:', req.files); // Debug: Log uploaded files
      const error = validateCompany(req.body);
      if (error) {
        return res.status(400).json({ error });
      }

      const {
        userId,
        name,
        description,
        website,
        video_url,
        location,
        pincode,
        state,
        industry,
        size,
        established_year,
      } = req.body;
      const parsedUserId = Number(userId); // Convert to number for database query
      console.log('Parsed userId:', parsedUserId); // Debug: Log parsed userId

      connection = await pool.getConnection();

      // Check if user exists
      const [user] = await connection.query('SELECT * FROM employers WHERE id = ?', [parsedUserId]);
      if (user.length === 0) {
        return res.status(400).json({ error: 'Invalid user' });
      }

      // Handle file uploads
      let logo_url = null;
      let banner_url = null;

      if (req.files && req.files.logo) {
        logo_url = `/uploads/logos/${req.files.logo[0].filename}`;
      }
      if (req.files && req.files.banner) {
        banner_url = `/uploads/banners/${req.files.banner[0].filename}`;
      }

      // Check if company exists for the user
      const [existingCompany] = await connection.query('SELECT * FROM companies WHERE employer_id = ?', [parsedUserId]);

      if (existingCompany.length > 0) {
        // Update existing company
        await connection.query(
          `UPDATE companies SET 
            name = ?, description = ?, website = ?, logo_url = ?, 
            banner_url = ?, video_url = ?, location = ?, pincode = ?, 
            state = ?, industry = ?, size = ?, established_year = ?
           WHERE employer_id = ?`,
          [
            name,
            description || null,
            website || null,
            logo_url || existingCompany[0].logo_url,
            banner_url || existingCompany[0].banner_url,
            video_url || null,
            location || null,
            pincode || null,
            state || null,
            industry || null,
            size || null,
            established_year || null,
            parsedUserId,
          ]
        );
      } else {
        // Insert new company
        await connection.query(
          `INSERT INTO companies (
            employer_id, name, description, website, logo_url, 
            banner_url, video_url, location, pincode, state, 
            industry, size, established_year
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            parsedUserId,
            name,
            description || null,
            website || null,
            logo_url,
            banner_url,
            video_url || null,
            location || null,
            pincode || null,
            state || null,
            industry || null,
            size || null,
            established_year || null,
          ]
        );
      }

      res.status(200).json({ message: 'Company details saved', logo_url, banner_url });
    } catch (error) {
      console.error('Company register error:', error);
      res.status(500).json({ error: 'Something went wrong', details: error.message });
    } finally {
      if (connection) connection.release();
    }
  },
];

export const getEmployer = async (req, res) => {
  let connection;
  try {
    const { userId } = req.params;
    connection = await pool.getConnection();

    const [user] = await connection.query('SELECT name, email, designation FROM employers WHERE id = ?', [
      userId,
    ]);

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user[0]);
  } catch (error) {
    console.error('Get employer error:', error);
    res.status(500).json({ error: 'Something went wrong', details: error.message });
  } finally {
    if (connection) connection.release();
  }
};

export const userUpdate = async (req, res) => {
  let connection;
  try {
    const error = validateUser(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const { userId, name, password, designation } = req.body;
    connection = await pool.getConnection();

    const [user] = await connection.query('SELECT * FROM employers WHERE id = ?', [userId]);
    if (user.length === 0) {
      return res.status(400).json({ error: 'Invalid user' });
    }

    const [existingEmail] = await connection.query('SELECT * FROM employers WHERE  id != ?', [
    userId
    ]);
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const updates = { name, designation };
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    await connection.query(
      'UPDATE employers SET name = ?, password = ?, designation = ? WHERE id = ?',
      [updates.name,  updates.password || user[0].password, updates.designation, userId]
    );

    res.status(200).json({ message: 'Employer details updated' });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ error: 'Something went wrong', details: error.message });
  } finally {
    if (connection) connection.release();
  }
};


export const getEmployerCompany = async (req, res) => {
  let connection;
  try {
    const { userId } = req.params; 

    if (!userId || isNaN(Number(userId))) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }

    connection = await pool.getConnection();

    // Check if employer exists
    const [employer] = await connection.query('SELECT id, name, email, designation FROM employers WHERE id = ?', [userId]);
    if (employer.length === 0) {
      return res.status(404).json({ error: 'Employer not found' });
    }

    // Fetch company details for this employer
    const [company] = await connection.query(
      `SELECT employer_id, name, description, website, logo_url, banner_url, video_url, location, pincode, state, industry, size, established_year
       FROM companies
       WHERE employer_id = ?`,
      [userId]
    );

    if (company.length === 0) {
      return res.status(404).json({ error: 'Company not found for this employer' });
    }

    res.status(200).json({
      employer: employer[0],
      company: company[0],
    });

  } catch (error) {
    console.error('Get employer company error:', error);
    res.status(500).json({ error: 'Something went wrong', details: error.message });
  } finally {
    if (connection) connection.release();
  }
};

export const employerLogin =  async (req, res) => {
  try {
    const { email, password } = req.body;

    const [employers] = await pool.query("SELECT * FROM employers WHERE email = ?", [email]);

    if (employers.length === 0)
      return res.status(400).json({ error: "Invalid credentials" });

    const user = employers[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        email: user.email,
        company_name: user.company_name || null,
      },
    });
  } catch (err) {
    console.error("Error in login:", err.message);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};
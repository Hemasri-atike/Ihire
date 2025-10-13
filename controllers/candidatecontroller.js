import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const candidateRegister = async (req, res) => {
  let connection;
  try {
    const { name, email, password } = req.body;
    connection = await pool.getConnection();

    // Check for existing user
    const [existingUser] = await connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into users table
    const [result] = await connection.query(
      "INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, NOW())",
      [name, email, hashedPassword]
    );

    const userId = result.insertId;
    const [userRows] = await connection.query(
      "SELECT id, name, email, created_at FROM users WHERE id = ?",
      [userId]
    );
    const user = userRows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1d" }
    );

    // Return response
    res.status(201).json({
      message: "Candidate registered successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error("Candidate register error:", error);
    res.status(500).json({ error: "Something went wrong", details: error.message });
  } finally {
    if (connection) connection.release();
  }
};

export const candidateLogin = async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;
    connection = await pool.getConnection();

    // Query the users table
    const [users] = await connection.query(
      "SELECT id, name, email, password, created_at FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.name, 
        email: user.email,
        role: "candidate", 
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error("Error in candidate login:", err.message);
    res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    if (connection) connection.release();
  }
};

export const getAllCandidates = async (req, res) => {
  try {
    const [results] = await pool.query("SELECT * FROM candidates");
    res.json(results);
  } catch (err) {
    console.error("getAllCandidates error:", err.message);
    res.status(500).json({ error: "Failed to fetch candidates", details: err.message });
  }
};

export const getCandidateById = async (req, res) => {
  try {
    const { id } = req.params;
    const [results] = await pool.query("SELECT * FROM candidates WHERE user_id = ?", [id]);
    if (results.length === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    res.json(results[0]);
  } catch (err) {
    console.error("getCandidateById error:", { message: err.message, stack: err.stack });
    res.status(500).json({ error: "Failed to fetch candidate", details: err.message });
  }
};

export const addCandidate = async (req, res) => {
  try {
    console.log("addCandidate: Received request", {
      body: req.body,
      file: req.file,
    });
    const {
      user_id, name, email, phone, address, linkedin, github, objective,
      graduationDegree, graduationState, graduationUniversity, graduationCollege, graduationYear, graduationCity,
      interBoard, interState, interStateBoard, interCollege, interStream, interYear, interCity,
      tenthBoard, tenthState, tenthCity, tenthSchool, tenthYear,
      experience, companyName, jobTitle, duration, responsibilities,
      currentLocation, preferredLocation
    } = req.body;

    const resume = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const query = `
      INSERT INTO candidates (
        user_id, name, email, phone, address, linkedin, github, objective,
        graduationDegree, graduationState, graduationUniversity, graduationCollege, graduationYear, graduationCity,
        interBoard, interState, interStateBoard, interCollege, interStream, interYear, interCity,
        tenthBoard, tenthState, tenthCity, tenthSchool, tenthYear,
        experience, companyName, jobTitle, duration, responsibilities,
        currentLocation, preferredLocation, resume
      ) VALUES (?,?,?,?,?,?,?,?,?,?,
               ?,?,?,?,?,?,?,
               ?,?,?,?,?,?,
               ?,?,?,?,?,
               ?,?,?,?,?,?)
    `;

    const values = [
      user_id, name, email, phone || null, address || null, linkedin || null, github || null, objective || null,
      graduationDegree || null, graduationState || null, graduationUniversity || null, graduationCollege || null, graduationYear || null, graduationCity || null,
      interBoard || null, interState || null, interStateBoard || null, interCollege || null, interStream || null, interYear || null, interCity || null,
      tenthBoard || null, tenthState || null, tenthCity || null, tenthSchool || null, tenthYear || null,
      experience || null, companyName || null, jobTitle || null, duration || null, responsibilities || null,
      currentLocation || null, preferredLocation || null, resume
    ];

    console.log("addCandidate: SQL Query Values:", values);
    const [result] = await pool.query(query, values);
    const [newCandidate] = await pool.query("SELECT * FROM candidates WHERE id = ?", [result.insertId]);
    res.status(201).json({ ...newCandidate[0], message: "Candidate added successfully", candidateId: result.insertId });
  } catch (err) {
    console.error("addCandidate error:", { message: err.message, stack: err.stack });
    res.status(500).json({ error: "Failed to add candidate", details: err.message });
  }
};

export const updateCandidate = async (req, res) => {
  try {
    const { user_id } = req.params;
    const {
      name, email, phone, address, linkedin, github, objective,
      graduationDegree, graduationState, graduationUniversity, graduationCollege, graduationYear, graduationCity,
      interBoard, interState, interStateBoard, interCollege, interStream, interYear, interCity,
      tenthBoard, tenthState, tenthCity, tenthSchool, tenthYear,
      experience, companyName, jobTitle, duration, responsibilities,
      currentLocation, preferredLocation
    } = req.body;
    const resume = req.file ? `/uploads/${req.file.filename}` : null;

    const [existing] = await pool.query("SELECT resume FROM candidates WHERE user_id = ?", [user_id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const query = `
      UPDATE candidates SET
        name = ?, email = ?, phone = ?, address = ?, linkedin = ?, github = ?, objective = ?,
        graduationDegree = ?, graduationState = ?, graduationUniversity = ?, graduationCollege = ?, graduationYear = ?, graduationCity = ?,
        interBoard = ?, interState = ?, interStateBoard = ?, interCollege = ?, interStream = ?, interYear = ?, interCity = ?,
        tenthBoard = ?, tenthState = ?, tenthCity = ?, tenthSchool = ?, tenthYear = ?,
        experience = ?, companyName = ?, jobTitle = ?, duration = ?, responsibilities = ?,
        currentLocation = ?, preferredLocation = ?, resume = COALESCE(?, resume)
      WHERE user_id = ?
    `;

    const values = [
      name || null, email || null, phone || null, address || null, linkedin || null, github || null, objective || null,
      graduationDegree || null, graduationState || null, graduationUniversity || null, graduationCollege || null, graduationYear || null, graduationCity || null,
      interBoard || null, interState || null, interStateBoard || null, interCollege || null, interStream || null, interYear || null, interCity || null,
      tenthBoard || null, tenthState || null, tenthCity || null, tenthSchool || null, tenthYear || null,
      experience || null, companyName || null, jobTitle || null, duration || null, responsibilities || null,
      currentLocation || null, preferredLocation || null, resume || existing[0].resume,
      user_id
    ];

    console.log("updateCandidate: SQL Query Values:", values);
    const [result] = await pool.query(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const [updated] = await pool.query("SELECT * FROM candidates WHERE user_id = ?", [user_id]);
    res.json({ ...updated[0], message: "Profile updated successfully" });
  } catch (err) {
    console.error("updateCandidate error:", { message: err.message, stack: err.stack });
    res.status(500).json({ error: "Failed to update candidate", details: err.message });
  }
};
import pool from "../config/db.js";

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
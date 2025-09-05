import pool from "../config/db.js";

// ✅ Get all candidates
export const getAllCandidates = async (req, res) => {
  try {
    const [results] = await pool.query("SELECT * FROM candidates");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const getCandidateById = async (req, res) => {
  try {
    const { id } = req.params;
    const [results] = await pool.query("SELECT * FROM candidates WHERE id = ?", [id]);
    if (results.length === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Add new candidate
export const addCandidate = async (req, res) => {
  try {
    const {
      name, email, phone,
      graduationDegree, graduationState, graduationUniversity, graduationCollege, graduationYear, graduationCity,
      interBoard, interState, interStateBoard, interCollege, interStream, interYear, interCity,
      tenthBoard, tenthState, tenthCity, tenthCollege, tenthSchool, tenthYear,
      experience, companyName, jobTitle, duration, responsibilities,
      currentLocation, preferredLocation
    } = req.body;

    // File upload (resume filename if uploaded)
    const resume = req.file ? req.file.filename : null;

    const query = `
      INSERT INTO candidates (
        name, email, phone,
        graduationDegree, graduationState, graduationUniversity, graduationCollege, graduationYear, graduationCity,
        interBoard, interState, interStateBoard, interCollege, interStream, interYear, interCity,
        tenthBoard, tenthState, tenthCity, tenthCollege, tenthSchool, tenthYear,
        experience, companyName, jobTitle, duration, responsibilities,
        currentLocation, preferredLocation, resume
      ) VALUES (?,?,?,?,?,?,?,?,?,
                ?,?,?,?,?,?,?,
                ?,?,?,?,?,?,
                ?,?,?,?,?,?,
                ?,?)
    `;

    const values = [
      name, email, phone,
      graduationDegree, graduationState, graduationUniversity, graduationCollege, graduationYear, graduationCity,
      interBoard, interState, interStateBoard, interCollege, interStream, interYear, interCity,
      tenthBoard, tenthState, tenthCity, tenthCollege, tenthSchool, tenthYear,
      experience, companyName, jobTitle, duration, responsibilities,
      currentLocation, preferredLocation, resume
    ];

    // Debug helper ✅ (can remove later)
    console.log("Placeholders:", (query.match(/\?/g) || []).length);
    console.log("Values:", values.length);

    const [result] = await pool.query(query, values);
    res.status(201).json({ message: "Candidate added successfully", candidateId: result.insertId });
  } catch (err) {
    console.error("Error adding candidate:", err);
    res.status(500).json({ error: "Failed to add candidate", details: err.message });
  }
};
export const updateCandidate = async (req, res) => {
  try {
    console.log("Update candidate - req.body:", req.body, "req.file:", req.file);
    const {
      name, email, phone,
      graduationDegree, graduationState, graduationUniversity, graduationCollege, graduationYear, graduationCity,
      interBoard, interState, interStateBoard, interCollege, interStream, interYear, interCity,
      tenthBoard, tenthState, tenthCity, tenthSchool, tenthYear,
      experience, companyName, jobTitle, duration, responsibilities,
      currentLocation, preferredLocation
    } = req.body;
    const resume = req.file ? `/uploads/${req.file.filename}` : null;
    const user_id = req.user.id;

    const [existing] = await pool.query("SELECT resume FROM candidates WHERE user_id = ?", [user_id]);
    const currentResume = existing.length > 0 ? existing[0].resume : null;

    const query = `
      UPDATE candidates SET
        name = ?, email = ?, phone = ?,
        graduationDegree = ?, graduationState = ?, graduationUniversity = ?, graduationCollege = ?, graduationYear = ?, graduationCity = ?,
        interBoard = ?, interState = ?, interStateBoard = ?, interCollege = ?, interStream = ?, interYear = ?, interCity = ?,
        tenthBoard = ?, tenthState = ?, tenthCity = ?, tenthSchool = ?, tenthYear = ?,
        experience = ?, companyName = ?, jobTitle = ?, duration = ?, responsibilities = ?,
        currentLocation = ?, preferredLocation = ?, resume = COALESCE(?, resume)
      WHERE user_id = ?
    `;

    const values = [
      name || null, email || null, phone || null,
      graduationDegree || null, graduationState || null, graduationUniversity || null, graduationCollege || null, graduationYear || null, graduationCity || null,
      interBoard || null, interState || null, interStateBoard || null, interCollege || null, interStream || null, interYear || null, interCity || null,
      tenthBoard || null, tenthState || null, tenthCity || null, tenthSchool || null, tenthYear || null,
      experience || null, companyName || null, jobTitle || null, duration || null, responsibilities || null,
      currentLocation || null, preferredLocation || null, resume || currentResume,
      user_id
    ];

    console.log("SQL Query Values:", values);
    const [result] = await pool.query(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const [updated] = await pool.query("SELECT * FROM candidates WHERE user_id = ?", [user_id]);
    res.json({ ...updated[0], message: "Profile updated successfully" });
  } catch (err) {
    console.error("Update candidate error:", err.message, err.stack);
    res.status(500).json({ error: "Failed to update profile", details: err.message });
  }
};

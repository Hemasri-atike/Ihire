import pool from "../config/db.js";

// Get all candidates
export const getAllCandidates = async (req, res) => {
  try {
    const [results] = await pool.query("SELECT * FROM candidates");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get candidate by ID
export const getCandidateById = async (req, res) => {
  try {
    const { id } = req.params;
    const [results] = await pool.query("SELECT * FROM candidates WHERE id = ?", [id]);
    if (results.length === 0) return res.status(404).json({ message: "Candidate not found" });
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Insert new candidate
export const addCandidate = async (req, res) => {
  try {
    const {
      name, email, phone, graduationDegree, graduationState, graduationUniversity, graduationCollege, graduationYear,
      interBoard, interState, interStateBoard, interCollege, interStream, interYear,
      tenthBoard, tenthState, tenthCollege, tenthYear, experience, companyName, jobTitle, duration,
      responsibilities, currentLocation, preferredLocation, resume
    } = req.body;

    const query = `
      INSERT INTO candidates (
        name,email,phone,graduationDegree,graduationState,graduationUniversity,graduationCollege,graduationYear,
        interBoard,interState,interStateBoard,interCollege,interStream,interYear,
        tenthBoard,tenthState,tenthCollege,tenthYear,experience,companyName,jobTitle,duration,responsibilities,currentLocation,preferredLocation,resume
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    const values = [
      name, email, phone, graduationDegree, graduationState, graduationUniversity, graduationCollege, graduationYear,
      interBoard, interState, interStateBoard, interCollege, interStream, interYear,
      tenthBoard, tenthState, tenthCollege, tenthYear, experience, companyName, jobTitle, duration,
      responsibilities, currentLocation, preferredLocation, resume
    ];

    const [results] = await pool.query(query, values);
    res.status(201).json({ message: "Candidate added successfully", id: results.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

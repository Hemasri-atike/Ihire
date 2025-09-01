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

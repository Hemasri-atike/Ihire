import pool from "../config/db.js";

console.log("Loading applicantcontroller.js");

const getApplicants = async (req, res) => {
  console.log("Handling GET /api/applicants");
  const { page = 1, limit = 8, status, search } = req.query;

  try {
    let query = "SELECT id, name, email, mobile, position, resume, status, notes FROM applicants";
    let countQuery = "SELECT COUNT(*) AS total FROM applicants";
    const params = [];
    let whereClauses = [];

    if (status && status !== "All") {
      whereClauses.push("status = ?");
      params.push(status);
    }

    if (search) {
      whereClauses.push("(name LIKE ? OR email LIKE ? OR position LIKE ?)");
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (whereClauses.length > 0) {
      const whereClause = ` WHERE ${whereClauses.join(" AND ")}`;
      query += whereClause;
      countQuery += whereClause;
    }

    query += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await pool.query(query, params);
    const [[{ total }]] = await pool.query(countQuery, params.slice(0, -2));

    const applicants = rows.map((row) => {
      let parsedNotes = [];
      if (row.notes) {
        try {
          parsedNotes = JSON.parse(row.notes);
          if (!Array.isArray(parsedNotes)) {
            console.warn(`Invalid notes format for applicant ${row.id}: expected array, got ${typeof parsedNotes}`);
            parsedNotes = [];
          }
        } catch (parseErr) {
          console.error(`Failed to parse notes for applicant ${row.id}: ${parseErr.message}`);
            parsedNotes = [];
        }
      }
      return {
        ...row,
        notes: parsedNotes,
      };
    });

    res.setHeader("Content-Type", "application/json");
    res.json({
      applicants,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("Error in getApplicants:", err.message, err.stack);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: "Error fetching applicants", details: err.message });
  }
};

const getApplicantsByJob = async (req, res) => {
  console.log(`Handling GET /jobs/${req.params.jobId}/applicants`);
  const { jobId } = req.params;
  const { page = 1, limit = 8 } = req.query;

  try {
    const [jobRows] = await pool.query("SELECT user_id FROM jobs WHERE id = ?", [jobId]);
    if (jobRows.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }
    if (jobRows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized: You do not own this job" });
    }

    let query = `
      SELECT a.id, a.name, a.email, a.mobile, a.position, a.resume, a.status, a.notes
      FROM applicants a
      JOIN applications app ON a.id = app.candidate_id
      WHERE app.job_id = ?
    `;
    let countQuery = "SELECT COUNT(*) AS total FROM applicants a JOIN applications app ON a.id = app.candidate_id WHERE app.job_id = ?";
    const params = [jobId];

    query += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await pool.query(query, params);
    const [[{ total }]] = await pool.query(countQuery, [jobId]);

    const applicants = rows.map((row) => {
      let parsedNotes = [];
      if (row.notes) {
        try {
          parsedNotes = JSON.parse(row.notes);
          if (!Array.isArray(parsedNotes)) {
            console.warn(`Invalid notes format for applicant ${row.id}: expected array, got ${typeof parsedNotes}`);
            parsedNotes = [];
          }
        } catch (parseErr) {
          console.error(`Failed to parse notes for applicant ${row.id}: ${parseErr.message}`);
          parsedNotes = [];
        }
      }
      return {
        ...row,
        notes: parsedNotes,
      };
    });

    res.setHeader("Content-Type", "application/json");
    res.json({
      applicants,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error(`Error in getApplicantsByJob for job ${jobId}:`, err.message, err.stack);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: "Error fetching applicants for job", details: err.message });
  }
};

const createApplicant = async (req, res) => {
  console.log("Handling POST /api/applicants");
  const { name, email, mobile, position, resume, status, notes } = req.body;

  try {
    let validatedNotes = null;
    if (notes) {
      if (!Array.isArray(notes)) {
        throw new Error("Notes must be an array or null");
      }
      validatedNotes = JSON.stringify(notes);
    }

    const [result] = await pool.query(
      "INSERT INTO applicants (name, email, mobile, position, resume, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, email, mobile, position, resume, status || "Applied", validatedNotes]
    );
    res.setHeader("Content-Type", "application/json");
    res.json({ message: "Applicant created successfully", applicantId: result.insertId });
  } catch (err) {
    console.error("Error in createApplicant:", err.message, err.stack);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: "Error creating applicant", details: err.message });
  }
};

const updateApplicantStatus = async (req, res) => {
  console.log("Handling PUT /api/applicants/:id/status");
  const { id } = req.params;
  const { status } = req.body;

  try {
    const [result] = await pool.query("UPDATE applicants SET status = ? WHERE id = ?", [status, id]);

    if (result.affectedRows === 0) {
      res.setHeader("Content-Type", "application/json");
      return res.status(404).json({ message: "Applicant not found" });
    }

    res.setHeader("Content-Type", "application/json");
    res.json({ id: parseInt(id), status });
  } catch (err) {
    console.error("Error in updateApplicantStatus:", err.message, err.stack);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: "Error updating status", details: err.message });
  }
};

const addApplicantNote = async (req, res) => {
  console.log("Handling POST /api/applicants/:id/notes");
  const { id } = req.params;
  const { note } = req.body;

  try {
    if (!note || typeof note !== "string" || note.trim() === "") {
      throw new Error("Note must be a non-empty string");
    }

    const [rows] = await pool.query("SELECT notes FROM applicants WHERE id = ?", [id]);
    if (rows.length === 0) {
      res.setHeader("Content-Type", "application/json");
      return res.status(404).json({ message: "Applicant not found" });
    }

    let currentNotes = [];
    if (rows[0].notes) {
      try {
        currentNotes = JSON.parse(rows[0].notes);
        if (!Array.isArray(currentNotes)) {
          console.warn(`Invalid notes format for applicant ${id}: expected array, got ${typeof currentNotes}`);
          currentNotes = [];
        }
      } catch (parseErr) {
        console.error(`Failed to parse notes for applicant ${id}: ${parseErr.message}`);
        currentNotes = [];
      }
    }
    currentNotes.push(note.trim());

    const [result] = await pool.query("UPDATE applicants SET notes = ? WHERE id = ?", [
      JSON.stringify(currentNotes),
      id,
    ]);

    if (result.affectedRows === 0) {
      res.setHeader("Content-Type", "application/json");
      return res.status(404).json({ message: "Applicant not found" });
    }

    res.setHeader("Content-Type", "application/json");
    res.json({ id: parseInt(id), note });
  } catch (err) {
    console.error("Error in addApplicantNote:", err.message, err.stack);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: "Error adding note", details: err.message });
  }
};

const deleteApplicant = async (req, res) => {
  console.log("Handling DELETE /api/applicants/:id");
  const { id } = req.params;

  try {
    const [result] = await pool.query("DELETE FROM applicants WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      res.setHeader("Content-Type", "application/json");
      return res.status(404).json({ message: "Applicant not found" });
    }

    res.setHeader("Content-Type", "application/json");
    res.json({ message: "Applicant deleted successfully" });
  } catch (err) {
    console.error("Error in deleteApplicant:", err.message, err.stack);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: "Error deleting applicant", details: err.message });
  }
};

export { getApplicants, getApplicantsByJob, createApplicant, updateApplicantStatus, addApplicantNote, deleteApplicant };
import pool from "../../config/db.js";

// Get full resume by userId with joins
export const getResumeByUserId = async (userId) => {
  const [resumeRows] = await pool.query(
    "SELECT * FROM resume WHERE userId = ?",
    [userId]
  );
  if (resumeRows.length === 0) return null;

  const resume = resumeRows[0];

  const [education] = await pool.query(
    "SELECT * FROM education WHERE resumeId = ?",
    [resume.id]
  );
  const [projects] = await pool.query(
    "SELECT * FROM projects WHERE resumeId = ?",
    [resume.id]
  );
  const [skills] = await pool.query(
    "SELECT * FROM skills WHERE resumeId = ?",
    [resume.id]
  );
  const [certifications] = await pool.query(
    "SELECT * FROM certifications WHERE resumeId = ?",
    [resume.id]
  );
  const [achievements] = await pool.query(
    "SELECT * FROM achievements WHERE resumeId = ?",
    [resume.id]
  );

  return {
    ...resume,
    education,
    projects,
    skills,
    certifications,
    achievements,
  };
};

// Insert or update resume
export const saveOrUpdateResume = async (userId, resumeData) => {
  const [rows] = await pool.query(
    "SELECT * FROM resume WHERE userId = ?",
    [userId]
  );

  let resumeId;

  const pi = resumeData.personalInfo || {};

  if (rows.length > 0) {
    resumeId = rows[0].id;
    await pool.query(
      "UPDATE resume SET fullName=?, email=?, phone=?, address=?, linkedin=?, github=?, objective=? WHERE id=?",
      [
        pi.fullName || "",
        pi.email || "",
        pi.phone || "",
        pi.address || "",
        pi.linkedin || "",
        pi.github || "",
        pi.objective || "",
        resumeId,
      ]
    );
  } else {
    const [result] = await pool.query(
      "INSERT INTO resume (userId, fullName, email, phone, address, linkedin, github, objective) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        userId,
        pi.fullName || "",
        pi.email || "",
        pi.phone || "",
        pi.address || "",
        pi.linkedin || "",
        pi.github || "",
        pi.objective || "",
      ]
    );
    resumeId = result.insertId;
  }

  // Delete old child records
  await pool.query("DELETE FROM education WHERE resumeId=?", [resumeId]);
  await pool.query("DELETE FROM projects WHERE resumeId=?", [resumeId]);
  await pool.query("DELETE FROM skills WHERE resumeId=?", [resumeId]);
  await pool.query("DELETE FROM certifications WHERE resumeId=?", [resumeId]);
  await pool.query("DELETE FROM achievements WHERE resumeId=?", [resumeId]);

  // Insert fresh child records
  if (resumeData.education?.length) {
    for (const edu of resumeData.education) {
      await pool.query(
        "INSERT INTO education (resumeId, degree, institution, year, percentage) VALUES (?, ?, ?, ?, ?)",
        [resumeId, edu.degree || "", edu.institution || "", edu.year || "", edu.percentage || ""]
      );
    }
  }

  if (resumeData.projects?.length) {
    for (const proj of resumeData.projects) {
      await pool.query(
        "INSERT INTO projects (resumeId, title, description, technologies, link) VALUES (?, ?, ?, ?, ?)",
        [resumeId, proj.title || "", proj.description || "", proj.technologies || "", proj.link || ""]
      );
    }
  }

  if (resumeData.skills?.length) {
    for (const skl of resumeData.skills) {
      await pool.query("INSERT INTO skills (resumeId, skill) VALUES (?, ?)", [resumeId, skl.skill || ""]);
    }
  }

  if (resumeData.certifications?.length) {
    for (const cert of resumeData.certifications) {
      await pool.query(
        "INSERT INTO certifications (resumeId, name, authority, year) VALUES (?, ?, ?, ?)",
        [resumeId, cert.name || "", cert.authority || "", cert.year || ""]
      );
    }
  }

  if (resumeData.achievements?.length) {
    for (const ach of resumeData.achievements) {
      await pool.query(
        "INSERT INTO achievements (resumeId, title, description) VALUES (?, ?, ?)",
        [resumeId, ach.title || "", ach.description || ""]
      );
    }
  }

  // Return full resume with child tables
  return await getResumeByUserId(userId);
};

import pool from "../../config/db.js";

// Get full resume by userId with joins
export const getResumeByUserId = async (userId) => {
  const connection = await pool.getConnection();
  try {
    const [resumeRows] = await connection.query(
      "SELECT id, userId, fullName, email, phone, address, linkedin, github, objective FROM resume WHERE userId = ?",
      [userId]
    );
    if (resumeRows.length === 0) return null;

    const resume = resumeRows[0];
    const resumeId = resume.id;

    const [education] = await connection.query(
      "SELECT id, degree, institution, year, percentage FROM education WHERE resumeId = ?",
      [resumeId]
    );
    const [projects] = await connection.query(
      "SELECT id, title, description, technologies, link FROM projects WHERE resumeId = ?",
      [resumeId]
    );
    const [cadexperiences] = await connection.query(
  "SELECT id, companyName, jobTitle, duration, description, responsibilities, resumeId FROM cadexperiences WHERE resumeId = ?",
  [resumeId]
);

    const [skills] = await connection.query(
      "SELECT id, skill, proficiency FROM skills WHERE resumeId = ?",
      [resumeId]
    );
    const [certifications] = await connection.query(
      "SELECT id, name, authority, year FROM certifications WHERE resumeId = ?",
      [resumeId]
    );
    const [achievements] = await connection.query(
      "SELECT id, title, description FROM achievements WHERE resumeId = ?",
      [resumeId]
    );


    return {
      id: resumeId,
      personalInfo: [{
        id: resumeId, // Use resumeId for personalInfo to match frontend
        fullName: resume.fullName || "",
        email: resume.email || "",
        phone: resume.phone || "",
        address: resume.address || "",
        linkedin: resume.linkedin || "",
        github: resume.github || "",
        objective: resume.objective || ""
      }],
      education,
      cadexperiences,
      projects,
      skills,
      certifications,
      achievements,
    };
  } catch (err) {
    console.error("❌ Error in getResumeByUserId:", err.message, { userId });
    throw err;
  } finally {
    connection.release();
  }
};

// Insert or update resume
export const saveOrUpdateResume = async (userId, resumeData) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Validate personalInfo
    if (!resumeData.personalInfo || !Array.isArray(resumeData.personalInfo) || resumeData.personalInfo.length !== 1) {
      throw new Error("Personal Information must be an array with exactly one entry");
    }

    const pi = resumeData.personalInfo[0];
    if (!pi.fullName || !pi.email) {
      throw new Error("Full Name and Email are required in Personal Information");
    }

    // Check if resume exists
    const [rows] = await connection.query(
      "SELECT id FROM resume WHERE userId = ?",
      [userId]
    );

    let resumeId;
    if (rows.length > 0) {
      resumeId = rows[0].id;
      // Update existing resume
      await connection.query(
        "UPDATE resume SET fullName = ?, email = ?, phone = ?, address = ?, linkedin = ?, github = ?, objective = ? WHERE id = ?",
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
      // Insert new resume
      const [result] = await connection.query(
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
    await connection.query("DELETE FROM education WHERE resumeId = ?", [resumeId]);
    await connection.query("DELETE FROM projects WHERE resumeId = ?", [resumeId]);
    await connection.query("DELETE FROM cadexperiences WHERE resumeId = ?", [resumeId]);
    await connection.query("DELETE FROM skills WHERE resumeId = ?", [resumeId]);
    await connection.query("DELETE FROM certifications WHERE resumeId = ?", [resumeId]);
    await connection.query("DELETE FROM achievements WHERE resumeId = ?", [resumeId]);

    // Insert new child records
    if (resumeData.education?.length) {
      for (const edu of resumeData.education) {
        if (!edu.degree || !edu.institution) continue; // Skip invalid entries
        const [result] = await connection.query(
          "INSERT INTO education (resumeId, degree, institution, year, percentage) VALUES (?, ?, ?, ?, ?)",
          [
            resumeId,
            edu.degree || "",
            edu.institution || "",
            edu.year || "",
            edu.percentage || ""
          ]
        );
        edu.id = result.insertId; // Add ID to match frontend expectations
      }
    }

if (resumeData.cadexperiences?.length) {
  for (const exp of resumeData.cadexperiences) {
    if (!exp.company || !exp.role) continue; // Validate required fields
    const [result] = await connection.query(
      "INSERT INTO cadexperiences (companyName, jobTitle, duration, description, responsibilities, resumeId) VALUES (?, ?, ?, ?, ?, ?)",
      [
        exp.companyName || "",
        exp.jobTitle || "",
        exp.duration || "",
        exp.responsibilities || "",
        exp.description || "",
        resumeId, // correct placement
      ]
    );
    exp.id = result.insertId; // Add ID
  }
}


    if (resumeData.projects?.length) {
      for (const proj of resumeData.projects) {
        if (!proj.title || !proj.description) continue; // Skip invalid entries
        const [result] = await connection.query(
          "INSERT INTO projects (resumeId, title, description, technologies, link) VALUES (?, ?, ?, ?, ?)",
          [
            resumeId,
            proj.title || "",
            proj.description || "",
            proj.technologies || "",
            proj.link || ""
          ]
        );
        proj.id = result.insertId; // Add ID
      }
    }

    if (resumeData.skills?.length) {
      for (const skl of resumeData.skills) {
        if (!skl.skill) continue; // Skip invalid entries
        const [result] = await connection.query(
          "INSERT INTO skills (resumeId, skill, proficiency) VALUES (?, ?, ?)",
          [resumeId, skl.skill || "", skl.proficiency || ""]
        );
        skl.id = result.insertId; // Add ID
      }
    }

    if (resumeData.certifications?.length) {
      for (const cert of resumeData.certifications) {
        if (!cert.name || !cert.authority) continue; // Skip invalid entries
        const [result] = await connection.query(
          "INSERT INTO certifications (resumeId, name, authority, year) VALUES (?, ?, ?, ?)",
          [resumeId, cert.name || "", cert.authority || "", cert.year || ""]
        );
        cert.id = result.insertId; // Add ID
      }
    }

    if (resumeData.achievements?.length) {
      for (const ach of resumeData.achievements) {
        if (!ach.title || !ach.description) continue; // Skip invalid entries
        const [result] = await connection.query(
          "INSERT INTO achievements (resumeId, title, description) VALUES (?, ?, ?)",
          [resumeId, ach.title || "", ach.description || ""]
        );
        ach.id = result.insertId; // Add ID
      }
    }

    await connection.commit();
    return await getResumeByUserId(userId);
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error in saveOrUpdateResume:", err.message, { userId, resumeData });
    throw err;
  } finally {
    connection.release();
  }
};
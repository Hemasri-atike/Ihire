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
    const userID = resume.userId

    const [education] = await connection.query(
      "SELECT id, degree, institution, year, percentage FROM education WHERE userId = ?",
      [userID]
    );
    const [projects] = await connection.query(
      "SELECT id, title, description, technologies, link FROM projects WHERE userId = ?",
      [userID]
    );
    const [experience] = await connection.query(
  "SELECT id, company_name, role, duration, description, location, employee_id FROM experience WHERE userId = ?",
  [userID]
);

    const [skills] = await connection.query(
      "SELECT id, skill, proficiency FROM skills WHERE userId = ?",
      [userID]
    );
    const [certifications] = await connection.query(
      "SELECT id, name, authority, year FROM certifications WHERE userId = ?",
      [userID]
    );
    const [achievements] = await connection.query(
      "SELECT id, title, description FROM achievements WHERE userId = ?",
      [userID]
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
      experience,
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
    console.log("resume.js",userId)
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
      "SELECT id,userId FROM resume WHERE userId = ?",
      [userId]
    );

    
    let resumeId;
    let user_id = rows[0].userId
    if (rows.length > 0) {
      resumeId = rows[0].id;
      
      // Update existing resume
      await connection.query(
        "UPDATE resume SET fullName = ?, email = ?, phone = ?, address = ?, linkedin = ?, github = ?, objective = ? WHERE id = ? AND userId = ?",
        [
          pi.fullName || "",
          pi.email || "",
          pi.phone || "",
          pi.address || "",
          pi.linkedin || "",
          pi.github || "",
          pi.objective || "",
          resumeId,
          user_id
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
    await connection.query("DELETE FROM education WHERE userId = ?", [user_id]);
    await connection.query("DELETE FROM projects WHERE userId = ?", [user_id]);
    await connection.query("DELETE FROM experience WHERE userId = ?", [user_id]);
    await connection.query("DELETE FROM skills WHERE userId = ?", [user_id]);
    await connection.query("DELETE FROM certifications WHERE userId = ?", [user_id]);
    await connection.query("DELETE FROM achievements WHERE userId = ?", [user_id]);

    // Insert new child records
    if (resumeData.education?.length) {
      for (const edu of resumeData.education) {
        if (!edu.degree || !edu.institution) continue; // Skip invalid entries
        const [result] = await connection.query(
          "INSERT INTO education (userId, degree, institution, year, percentage) VALUES (?, ?, ?, ?, ?)",
          [
              user_id,
            edu.degree || "",
            edu.institution || "",
            edu.year || "",
            edu.percentage || ""
          ]
        );
        edu.id = result.insertId; // Add ID to match frontend expectations
      }
    }

if (resumeData.experience?.length) {
  console.log("res",resumeData.experience)
  for (const exp of resumeData.experience) {
    if (!exp.company_name || !exp.role) continue; // Validate required fields
    const [result] = await connection.query(
      "INSERT INTO experience (company_name, role, duration, description, location, employee_id,userId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        exp.company_name || "",
        exp.role || "",
        exp.duration || "",
        exp.description || "",
        exp.location || "",
        exp.employee_id, // correct placement
       user_id
      ]
    );
    exp.id = result.insertId; // Add ID
  }
}


    if (resumeData.projects?.length) {
      for (const proj of resumeData.projects) {
        if (!proj.title || !proj.description) continue; // Skip invalid entries
        const [result] = await connection.query(
          "INSERT INTO projects (userId, title, description, technologies, link) VALUES (?, ?, ?, ?, ?)",
          [
            user_id,
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
          "INSERT INTO skills (userId, skill, proficiency) VALUES (?, ?, ?)",
          [user_id, skl.skill || "", skl.proficiency || ""]
        );
        skl.id = result.insertId; // Add ID
      }
    }

    if (resumeData.certifications?.length) {
      for (const cert of resumeData.certifications) {
        if (!cert.name || !cert.authority) continue; // Skip invalid entries
        const [result] = await connection.query(
          "INSERT INTO certifications (userId, name, authority, year) VALUES (?, ?, ?, ?)",
          [user_id, cert.name || "", cert.authority || "", cert.year || ""]
        );
        cert.id = result.insertId; // Add ID
      }
    }

    if (resumeData.achievements?.length) {
      for (const ach of resumeData.achievements) {
        if (!ach.title || !ach.description) continue; // Skip invalid entries
        const [result] = await connection.query(
          "INSERT INTO achievements (userId, title, description) VALUES (?, ?, ?)",
          [user_id, ach.title || "", ach.description || ""]
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
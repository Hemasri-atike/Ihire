
import  pool  from "../config/db.js"; 

export const uploadResume = async (req, res) => {
  try {
    if (!req.files || !req.files.resume) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const resumeFile = req.files.resume;
    const uploadPath = `uploads/${Date.now()}_${resumeFile.name.substring(0, 100)}`;

    await resumeFile.mv(uploadPath);
    res.json({ filePath: uploadPath });
  } catch (error) {
    console.error("Resume upload error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "File upload failed", details: error.message });
  }
};
export const createEmployee = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      fullName,
      email,
      phone,
      gender,
      dob,
      location,
      resume,
      userId,
      skills = [],
      education = [],
      experience = [],
      certifications = []
    } = req.body;

    // 🔎 Check for existing email
    const [existing] = await conn.execute(
      'SELECT id FROM employees WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Email already exists. Please use a different email.' });
    }

    // 📝 Insert new employee
    const [result] = await conn.execute(
      `INSERT INTO employees 
         (full_name, email, phone, gender, dob, location, resume, user_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [fullName, email, phone, gender, dob, location, resume, userId]
    );

    const employeeId = result.insertId;

    // ➕ Insert related tables (skills, education, experience, certifications) here
    // Example for experience:
    for (const exp of experience) {
      await conn.execute(
        `INSERT INTO experience 
           (employee_id, userId, company_name, role, duration, location, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [employeeId, userId, exp.company_name, exp.role, exp.duration, exp.location, exp.description]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Employee created successfully', employeeId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};


// export const createEmployee = async (req, res) => {
//   let conn;
//   try {
//     // Get connection from pool
//     conn = await pool.getConnection();

//     // Check if connection is valid
//     if (conn.connection._closing) {
//       throw new Error("Connection is in a closed state");
//     }

//     await conn.beginTransaction();

//     const {
//       fullName,
//       email,
//       phone,
//       gender,
//       dob,
//       location,
//       resume,
//       skills = [],
//       education = [],
//       experience = [],
//       certifications = [],
//       userId,
//     } = req.body;

//     // Log received data
//     console.log("Received data for createEmployee:", JSON.stringify(req.body, null, 2));

//     // Validate required fields
//     if (!fullName || !email || !phone || !location || !userId) {
//       throw new Error("Missing required fields: fullName, email, phone, location, userId");
//     }

//     // Validate gender
//     const validGenders = ["Male", "Female", "Others", null]; // Align with frontend gender mapping
//     if (gender && !validGenders.includes(gender)) {
//       throw new Error(`Invalid gender value: ${gender}. Must be 'M', 'F', 'O', or null`);
//     }

//     // Prepare data
//     const genderValue = gender ?? null;
//     const dobValue = dob ? new Date(dob).toISOString().split("T")[0] : null;
//     const locationValue = location.substring(0, 100) ?? null;
//     const resumeValue = resume ? resume.substring(0, 100) : null;

//     const query = `
//       INSERT INTO employees 
//       (full_name, email, phone, gender, dob, location, resume, user_id) 
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//     `;
//     const values = [
//       fullName.substring(0, 255),
//       email.substring(0, 255),
//       phone.substring(0, 15),
//       genderValue,
//       dobValue,
//       locationValue,
//       resumeValue,
//       userId,
//     ];

//     // Log SQL query and values
//     console.log("Executing query:", query);
//     console.log("Query values:", JSON.stringify(values, null, 2));

//     const [result] = await conn.execute(query, values);
//     const employeeId = result.insertId;

//     // Insert skills
//     for (const skill of skills) {
//       if (skill && skill.trim()) {
//         await conn.execute(
//           "INSERT INTO skills (employee_id, skill) VALUES (?, ?)",
//           [employeeId, skill.substring(0, 100)]
//         );
//       }
//     }

//     // Insert education
//     for (const edu of education) {
//       const eduValues = {
//         state: edu.state?.substring(0, 100) ?? null,
//         city: edu.city?.substring(0, 100) ?? null,
//         university: edu.university?.substring(0, 255) ?? null,
//         college: edu.college?.substring(0, 255) ?? null,
//         degree: edu.degree?.substring(0, 100) ?? null,
//         field_of_study: edu.field_of_study?.substring(0, 100) || "Not specified",
//         duration: edu.duration?.substring(0, 50) || "Unknown",
//       };
//       await conn.execute(
//         `INSERT INTO education 
//         (employee_id, state, city, university, college, degree, field_of_study, duration)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           employeeId,
//           eduValues.state,
//           eduValues.city,
//           eduValues.university,
//           eduValues.college,
//           eduValues.degree,
//           eduValues.field_of_study,
//           eduValues.duration,
//         ]
//       );
//     }

//     // Insert experience
//     for (const exp of experience) {
//       await conn.execute(
//         `INSERT INTO experience 
//         (employee_id, company_name, role, duration, location, description)
//         VALUES (?, ?, ?, ?, ?, ?)`,
//         [
//           employeeId,
//           exp.company_name?.substring(0, 255) ?? null,
//           exp.role?.substring(0, 100) ?? null,
//           exp.duration?.substring(0, 50) ?? null,
//           exp.location?.substring(0, 100) ?? null,
//           exp.description?.substring(0, 500) ?? null,
//         ]
//       );
//     }

//     // Insert certifications
//     for (const cert of certifications) {
//       const certName = cert.cert_name?.substring(0, 255) ?? null;
//       await conn.execute(
//         `INSERT INTO certifications
//         (employee_id, name, authority, year, cert_name)
//         VALUES (?, ?, ?, ?, ?)`,
//         [
//           employeeId,
//           certName,
//           cert.organization?.substring(0, 255) ?? null,
//           cert.issue_date ? new Date(cert.issue_date).getFullYear() : null,
//           certName,
//         ]
//       );
//     }

//     await conn.commit();
//     res.json({ message: "Employee profile saved successfully", employeeId });
//   } catch (error) {
//     console.error("Database error in createEmployee:", {
//       message: error.message,
//       sql: error.sql,
//       sqlMessage: error.sqlMessage,
//       stack: error.stack,
//       requestData: JSON.stringify(req.body, null, 2),
//     });
//     try {
//       if (conn && !conn.connection._closing) {
//         await conn.rollback();
//       }
//     } catch (rollbackError) {
//       console.error("Rollback error:", {
//         message: rollbackError.message,
//         stack: rollbackError.stack,
//       });
//     }
//     res.status(500).json({ error: "Failed to save profile", details: error.message });
//   } finally {
//     if (conn) {
//       try {
//         conn.release();
//       } catch (releaseError) {
//         console.error("Error releasing connection:", {
//           message: releaseError.message,
//           stack: releaseError.stack,
//         });
//       }
//     }
//   }
// };

export const getEmployeeById = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { id } = req.params;

    const [[employee]] = await conn.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) {
      return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    const [skills] = await conn.execute(
      "SELECT skill FROM skills WHERE employee_id = ?",
      [id]
    );
    const [education] = await conn.execute(
      "SELECT * FROM education WHERE employee_id = ?",
      [id]
    );
    const [experience] = await conn.execute(
      "SELECT * FROM experience WHERE employee_id = ?",
      [id]
    );
    const [certifications] = await conn.execute(
      "SELECT cert_name AS cert_name, authority AS organization, year AS issue_date FROM certifications WHERE employee_id = ?",
      [id]
    );

    res.json({
      id: employee.id,
      fullName: employee.full_name,
      email: employee.email,
      phone: employee.phone,
      gender: employee.gender,
      dob: employee.dob,
      location: employee.location,
      resume: employee.resume,
      skills: skills.map((s) => s.skill),
      education,
      experience,
      certifications,
    });
  } catch (error) {
    console.error("Error in getEmployeeById:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to fetch profile", details: error.message });
  } finally {
    if (conn) conn.release();
  }
};

export const getAllEmployees = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [employees] = await conn.execute(
      "SELECT * FROM employees WHERE user_id = ?",
      [req.user.id]
    );
    res.json(employees);
  } catch (error) {
    console.error("Error in getAllEmployees:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to fetch employees", details: error.message });
  } finally {
    if (conn) conn.release();
  }
};

export const addEmployeeSkill = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { id } = req.params;
    const { skill } = req.body;

    if (!skill || !skill.trim()) {
      return res.status(400).json({ error: "Skill is required" });
    }

    const [[employee]] = await conn.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) {
      return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    await conn.execute(
      "INSERT INTO skills (employee_id, skill) VALUES (?, ?)",
      [id, skill.substring(0, 100)]
    );
    res.json({ message: "Skill added successfully" });
  } catch (error) {
    console.error("Error in addEmployeeSkill:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to add skill", details: error.message });
  } finally {
    if (conn) conn.release();
  }
};

export const deleteEmployeeSkill = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { id, skill } = req.params;

    const [[employee]] = await conn.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) {
      return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    const [result] = await conn.execute(
      "DELETE FROM skills WHERE employee_id = ? AND skill = ?",
      [id, skill]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Skill not found" });
    }
    res.json({ message: "Skill deleted successfully" });
  } catch (error) {
    console.error("Error in deleteEmployeeSkill:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to delete skill", details: error.message });
  } finally {
    if (conn) conn.release();
  }
};

export const getEmployeeSkills = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { id } = req.params;

    const [[employee]] = await conn.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) {
      return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    const [skills] = await conn.execute(
      "SELECT skill FROM skills WHERE employee_id = ?",
      [id]
    );
    res.json(skills.map((s) => s.skill));
  } catch (error) {
    console.error("Error in getEmployeeSkills:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to fetch skills", details: error.message });
  } finally {
    if (conn) conn.release();
  }
};

export const addEmployeeEducation = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { id } = req.params;
    const { state, city, university, college, degree, field_of_study, duration } = req.body;

    if (!state || !city || !university || !college || !degree || !field_of_study || !duration) {
      return res.status(400).json({ error: "All education fields are required" });
    }

    const [[employee]] = await conn.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) {
      return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    const [result] = await conn.execute(
      `INSERT INTO education 
      (employee_id, state, city, university, college, degree, field_of_study, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        state.substring(0, 100),
        city.substring(0, 100),
        university.substring(0, 255),
        college.substring(0, 255),
        degree.substring(0, 100),
        field_of_study.substring(0, 100),
        duration.substring(0, 50),
      ]
    );
    res.json({ message: "Education added successfully", educationId: result.insertId });
  } catch (error) {
    console.error("Error in addEmployeeEducation:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to add education", details: error.message });
  } finally {
    if (conn) conn.release();
  }
};

export const deleteEmployeeEducation = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { id, educationId } = req.params;

    const [[employee]] = await conn.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) {
      return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    const [result] = await conn.execute(
      "DELETE FROM education WHERE employee_id = ? AND id = ?",
      [id, educationId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Education not found" });
    }
    res.json({ message: "Education deleted successfully" });
  } catch (error) {
    console.error("Error in deleteEmployeeEducation:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to delete education", details: error.message });
  } finally {
    if (conn) conn.release();
  }
};

export const getEmployeeEducation = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { id } = req.params;

    const [[employee]] = await conn.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) {
      return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    const [education] = await conn.execute(
      "SELECT * FROM education WHERE employee_id = ?",
      [id]
    );
    res.json(education);
  } catch (error) {
    console.error("Error in getEmployeeEducation:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to fetch education", details: error.message });
  } finally {
    if (conn) conn.release();
  }
};

export const addEmployeeExperience = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { id } = req.params;
    const { company_name, role, duration, location, description } = req.body;

    if (!company_name || !role || !duration) {
      return res.status(400).json({ error: "Company name, role, and duration are required" });
    }

    const [[employee]] = await conn.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) {
      return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    const [result] = await conn.execute(
      `INSERT INTO experience 
      (employee_id, company_name, role, duration, location, description)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        company_name.substring(0, 255),
        role.substring(0, 100),
        duration.substring(0, 50),
        location?.substring(0, 100) ?? null,
        description?.substring(0, 500) ?? null,
      ]
    );
    res.json({ message: "Experience added successfully", experienceId: result.insertId });
  } catch (error) {
    console.error("Error in addEmployeeExperience:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to add experience", details: error.message });
  } finally {
    if (conn) conn.release();
  }
};

export const deleteEmployeeExperience = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { id, experienceId } = req.params;

    const [[employee]] = await conn.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) {
      return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    const [result] = await conn.execute(
      "DELETE FROM experience WHERE employee_id = ? AND id = ?",
      [id, experienceId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Experience not found" });
    }
    res.json({ message: "Experience deleted successfully" });
  } catch (error) {
    console.error("Error in deleteEmployeeExperience:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to delete experience", details: error.message });
  } finally {
    if (conn) conn.release();
  }
};

export const getEmployeeExperience = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { id } = req.params;

    const [[employee]] = await conn.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) {
      return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    const [experience] = await conn.execute(
      "SELECT * FROM experience WHERE employee_id = ?",
      [id]
    );
    res.json(experience);
  } catch (error) {
    console.error("Error in getEmployeeExperience:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to fetch experience", details: error.message });
  } finally {
    if (conn) conn.release();
  }
};

export const addEmployeeCertification = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { id } = req.params;
    const { cert_name, organization, issue_date } = req.body;

    if (!cert_name || !organization) {
      return res.status(400).json({ error: "Certification name and organization are required" });
    }

    const [[employee]] = await conn.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) {
      return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    const [result] = await conn.execute(
      `INSERT INTO certifications
      (employee_id, name, authority, year, cert_name)
      VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        cert_name.substring(0, 255),
        organization.substring(0, 255),
        issue_date ? new Date(issue_date).getFullYear() : null,
        cert_name.substring(0, 255),
      ]
    );
    res.json({ message: "Certification added successfully", certificationId: result.insertId });
  } catch (error) {
    console.error("Error in addEmployeeCertification:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to add certification", details: error.message });
  } finally {
    if (conn) conn.release();
  }
};

export const deleteEmployeeCertification = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { id, cert_name } = req.params;

    const [[employee]] = await conn.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) {
      return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    const [result] = await conn.execute(
      "DELETE FROM certifications WHERE employee_id = ? AND cert_name = ?",
      [id, cert_name]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Certification not found" });
    }
    res.json({ message: "Certification deleted successfully" });
  } catch (error) {
    console.error("Error in deleteEmployeeCertification:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to delete certification", details: error.message });
  } finally {
    if (conn) conn.release();
  }
};

export const getEmployeeCertifications = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const { id } = req.params;

    const [[employee]] = await conn.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) {
      return res.status(404).json({ error: "Employee not found or unauthorized" });
    }

    const [certifications] = await conn.execute(
      "SELECT cert_name AS cert_name, authority AS organization, year AS issue_date FROM certifications WHERE employee_id = ?",
      [id]
    );
    res.json(certifications);
  } catch (error) {
    console.error("Error in getEmployeeCertifications:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to fetch certifications", details: error.message });
  } finally {
    if (conn) conn.release();
  }
};
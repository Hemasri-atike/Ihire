// src/controllers/empcontroller.js
import pool from "../config/db.js";

export const uploadResume = (req, res) => {
  if (!req.files || !req.files.resume) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const resumeFile = req.files.resume;
  const uploadPath = `uploads/${Date.now()}_${resumeFile.name}`;

  resumeFile.mv(uploadPath, (err) => {
    if (err) return res.status(500).json({ error: "File upload failed" });
    res.json({ filePath: uploadPath });
  });
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
      skills = [],
      education = [],
      experience = [],
      certifications = [],
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !location) {
      throw new Error("Missing required fields: fullName, email, phone, location");
    }

    // Replace undefined with null
    const genderValue = gender ?? null;
    const dobValue = dob ? new Date(dob).toISOString().split("T")[0] : null;
    const locationValue = location ?? null;
    const resumeValue = resume ?? null;

    const [result] = await conn.execute(
      `INSERT INTO employees 
      (full_name, email, phone, gender, dob, location, resume, user_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [fullName, email, phone, genderValue, dobValue, locationValue, resumeValue, req.user.id]
    );

    const employeeId = result.insertId;

    for (const skill of skills) {
      if (skill) {
        await conn.execute(
          "INSERT INTO skills (employee_id, skill) VALUES (?, ?)",
          [employeeId, skill]
        );
      }
    }

    // Insert education
    for (const edu of education) {
      await conn.execute(
        `INSERT INTO education 
        (employee_id, state, city, university, college, degree, field_of_study, duration)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employeeId,
          edu.state ?? null,
          edu.city ?? null,
          edu.university ?? null,
          edu.college ?? null,
          edu.degree ?? null,
          edu.field_of_study ?? null,
          edu.duration ?? null,
        ]
      );
    }

    // Insert experience
    for (const exp of experience) {
      await conn.execute(
        `INSERT INTO experience 
        (employee_id, company_name, role, duration, location, description)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          employeeId,
          exp.company_name ?? null,
          exp.role ?? null,
          exp.duration ?? null,
          exp.location ?? null,
          exp.description ?? null,
        ]
      );
    }

    // Insert certifications
    for (const cert of certifications) {
      await conn.execute(
        `INSERT INTO certifications
        (employee_id, name, authority, year, cert_name)
        VALUES (?, ?, ?, ?, ?)`,
        [
          employeeId,
          cert.cert_name ?? null,
          cert.organization ?? null,
          cert.issue_date ? new Date(cert.issue_date).getFullYear() : null,
          cert.cert_name ?? null,
        ]
      );
    }

    await conn.commit();
    res.json({ message: "Employee profile saved successfully", employeeId });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ error: "Failed to save profile", details: error.message });
  } finally {
    conn.release();
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const [[employee]] = await pool.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) return res.status(404).json({ error: "Employee not found or unauthorized" });

    const [skills] = await pool.execute(
      "SELECT * FROM skills WHERE employee_id = ?",
      [id]
    );
    const [education] = await pool.execute(
      "SELECT * FROM education WHERE employee_id = ?",
      [id]
    );
    const [experience] = await pool.execute(
      "SELECT * FROM experience WHERE employee_id = ?",
      [id]
    );
    const [certifications] = await pool.execute(
      "SELECT * FROM certifications WHERE employee_id = ?",
      [id]
    );

    res.json({ employee, skills, education, experience, certifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

export const getAllEmployees = async (req, res) => {
  try {
    const [employees] = await pool.execute("SELECT * FROM employees WHERE user_id = ?", [req.user.id]);
    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
};

export const addEmployeeSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { skill } = req.body;

    const [[employee]] = await pool.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) return res.status(404).json({ error: "Employee not found or unauthorized" });

    await pool.execute(
      "INSERT INTO skills (employee_id, skill) VALUES (?, ?)",
      [id, skill ?? null]
    );
    res.json({ message: "Skill added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add skill" });
  }
};

export const deleteEmployeeSkill = async (req, res) => {
  try {
    const { id, skill } = req.params;

    const [[employee]] = await pool.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) return res.status(404).json({ error: "Employee not found or unauthorized" });

    const [result] = await pool.execute(
      "DELETE FROM skills WHERE employee_id = ? AND skill = ?",
      [id, skill]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Skill not found" });
    }
    res.json({ message: "Skill deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete skill" });
  }
};

export const getEmployeeSkills = async (req, res) => {
  try {
    const { id } = req.params;

    const [[employee]] = await pool.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) return res.status(404).json({ error: "Employee not found or unauthorized" });

    const [skills] = await pool.execute(
      "SELECT * FROM skills WHERE employee_id = ?",
      [id]
    );
    res.json(skills);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch skills" });
  }
};

export const addEmployeeEducation = async (req, res) => {
  try {
    const { id } = req.params;
    const { state, city, university, college, degree, field_of_study, duration } = req.body;

    const [[employee]] = await pool.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) return res.status(404).json({ error: "Employee not found or unauthorized" });

    const [result] = await pool.execute(
      "INSERT INTO education (employee_id, state, city, university, college, degree, field_of_study, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        state ?? null,
        city ?? null,
        university ?? null,
        college ?? null,
        degree ?? null,
        field_of_study ?? null,
        duration ?? null,
      ]
    );
    res.json({ message: "Education added successfully", educationId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add education" });
  }
};

export const deleteEmployeeEducation = async (req, res) => {
  try {
    const { id, educationId } = req.params;

    const [[employee]] = await pool.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) return res.status(404).json({ error: "Employee not found or unauthorized" });

    const [result] = await pool.execute(
      "DELETE FROM education WHERE employee_id = ? AND id = ?",
      [id, educationId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Education not found" });
    }
    res.json({ message: "Education deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete education" });
  }
};

export const getEmployeeEducation = async (req, res) => {
  try {
    const { id } = req.params;

    const [[employee]] = await pool.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) return res.status(404).json({ error: "Employee not found or unauthorized" });

    const [education] = await pool.execute(
      "SELECT * FROM education WHERE employee_id = ?",
      [id]
    );
    res.json(education);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch education" });
  }
};

export const addEmployeeExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, role, duration, location, description } = req.body;

    const [[employee]] = await pool.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) return res.status(404).json({ error: "Employee not found or unauthorized" });

    const [result] = await pool.execute(
      "INSERT INTO experience (employee_id, company_name, role, duration, location, description) VALUES (?, ?, ?, ?, ?, ?)",
      [id, company_name ?? null, role ?? null, duration ?? null, location ?? null, description ?? null]
    );
    res.json({ message: "Experience added successfully", experienceId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add experience" });
  }
};

export const deleteEmployeeExperience = async (req, res) => {
  try {
    const { id, experienceId } = req.params;

    const [[employee]] = await pool.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) return res.status(404).json({ error: "Employee not found or unauthorized" });

    const [result] = await pool.execute(
      "DELETE FROM experience WHERE employee_id = ? AND id = ?",
      [id, experienceId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Experience not found" });
    }
    res.json({ message: "Experience deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete experience" });
  }
};

export const getEmployeeExperience = async (req, res) => {
  try {
    const { id } = req.params;

    const [[employee]] = await pool.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) return res.status(404).json({ error: "Employee not found or unauthorized" });

    const [experience] = await pool.execute(
      "SELECT * FROM experience WHERE employee_id = ?",
      [id]
    );
    res.json(experience);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch experience" });
  }
};

export const addEmployeeCertification = async (req, res) => {
  try {
    const { id } = req.params;
    const { cert_name, organization, issue_date } = req.body;

    const [[employee]] = await pool.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) return res.status(404).json({ error: "Employee not found or unauthorized" });

    const [result] = await pool.execute(
      `INSERT INTO certifications
       (employee_id, name, authority, year, cert_name)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        cert_name ?? null,
        organization ?? null,
        issue_date ? new Date(issue_date).getFullYear() : null,
        cert_name ?? null,
      ]
    );
    res.json({ message: "Certification added successfully", certificationId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add certification" });
  }
};

export const deleteEmployeeCertification = async (req, res) => {
  try {
    const { id, cert_name } = req.params;

    const [[employee]] = await pool.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) return res.status(404).json({ error: "Employee not found or unauthorized" });

    const [result] = await pool.execute(
      "DELETE FROM certifications WHERE employee_id = ? AND cert_name = ?",
      [id, cert_name]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Certification not found" });
    }
    res.json({ message: "Certification deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete certification" });
  }
};

export const getEmployeeCertifications = async (req, res) => {
  try {
    const { id } = req.params;

    const [[employee]] = await pool.execute(
      "SELECT * FROM employees WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (!employee) return res.status(404).json({ error: "Employee not found or unauthorized" });

    const [certifications] = await pool.execute(
      "SELECT * FROM certifications WHERE employee_id = ?",
      [id]
    );
    res.json(certifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch certifications" });
  }
};
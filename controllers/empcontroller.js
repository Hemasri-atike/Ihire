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

    // Replace undefined with null
    const genderValue = gender ?? null;
    const dobValue = dob ?? null;
    const locationValue = location ?? null;
    const resumeValue = resume ?? null;

    // Insert employee
    const [result] = await conn.execute(
      `INSERT INTO employees 
      (full_name, email, phone, gender, dob, location, resume) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fullName, email, phone, genderValue, dobValue, locationValue, resumeValue]
    );

    const employeeId = result.insertId;

    // Insert skills
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
          cert.cert_name ?? null,  // maps to `name`
          cert.organization ?? null, // maps to `authority`
          cert.issue_date ? new Date(cert.issue_date).getFullYear() : null, // maps to `year`
          cert.cert_name ?? null    // maps to `cert_name`
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
      "SELECT * FROM employees WHERE id = ?",
      [id]
    );
    if (!employee) return res.status(404).json({ error: "Employee not found" });

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

export const addEmployeeSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { skill } = req.body;
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

export const getEmployeeSkills = async (req, res) => {
  try {
    const { id } = req.params;
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
    await pool.execute(
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
    res.json({ message: "Education added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add education" });
  }
};

export const getEmployeeEducation = async (req, res) => {
  try {
    const { id } = req.params;
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
    await pool.execute(
      "INSERT INTO experience (employee_id, company_name, role, duration, location, description) VALUES (?, ?, ?, ?, ?, ?)",
      [id, company_name ?? null, role ?? null, duration ?? null, location ?? null, description ?? null]
    );
    res.json({ message: "Experience added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add experience" });
  }
};

export const getEmployeeExperience = async (req, res) => {
  try {
    const { id } = req.params;
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
    const { cert_name, organization, issue_date, expiry_date } = req.body;

    await pool.execute(
      `INSERT INTO certifications
       (employee_id, name, authority, year, cert_name)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        cert_name ?? null, // maps to `name`
        organization ?? null, // maps to `authority`
        issue_date ? new Date(issue_date).getFullYear() : null, // maps to `year`
        cert_name ?? null, // maps to `cert_name`
      ]
    );

    res.json({ message: "Certification added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add certification" });
  }
};
export const getEmployeeCertifications = async (req, res) => {
  try {
    const { id } = req.params;
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

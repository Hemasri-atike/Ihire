import pool from "../config/db.js";


export const createJob = async (req, res) => {
  try {
    const {
      employer_id,
      company_id,
      title,
      about_position,
      key_responsibilities,
      requirements,
      description,
      job_type,
      experience_level,
      min_salary,
      max_salary,
      salary_currency,
      salary_type,
      location,
      is_remote,
      work_mode,
      skills_required,
      vacancies,
      status,
      expires_at,
      industry_id,
      category_id,
      subcategory_id,
    } = req.body;

    // Validate required fields
    if (!employer_id || !company_id || !title || !job_type || !industry_id || !category_id || !subcategory_id) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    const query = `
      INSERT INTO jobs (
        employer_id, company_id, title, about_position, key_responsibilities, 
        requirements, description, job_type, experience_level, min_salary, 
        max_salary, salary_currency, salary_type, location, is_remote, 
        work_mode, skills_required, vacancies, status, expires_at,
        industry_id, category_id, subcategory_id
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      employer_id,
      company_id,
      title,
      about_position || null,
      key_responsibilities || null,
      requirements || null,
      description || null,
      job_type,
      experience_level || "Fresher",
      min_salary || null,
      max_salary || null,
      salary_currency || "INR",
      salary_type || "Monthly",
      location || null,
      is_remote || false,
      work_mode || "On-site",
      skills_required || null,
      vacancies || 1,
      status || "active",
      expires_at || null,
      industry_id,
      category_id,
      subcategory_id,
    ];

    const [result] = await pool.query(query, values);

    res.status(201).json({
      message: "Job created successfully",
      jobId: result.insertId,
    });
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(500).json({ message: "Error creating job", error });
  }
};

export const getAllJobs = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM jobs ORDER BY posted_at DESC");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Error fetching jobs", error });
  }
};

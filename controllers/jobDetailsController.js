import pool from "../config/db.js";


export const createJob =async (req, res) => {
  const form = req.body;

  if (!form.company_id) return res.status(400).json({ message: 'company_id required' });
  if (!form.title) return res.status(400).json({ message: 'title required' });

  try {
    const [result] = await pool.query(
      `INSERT INTO jobs (
        company_id, title, role, function_area, location, employment_type,
        experience_min, experience_max, salary_min, salary_max, hide_salary,
        vacancies, education, industry, responsibilities, qualifications,
        description, skills, labels, questions, walkin_details,
        receive_matching_email, share_with_subusers, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        form.company_id,
        form.title,
        form.role || null,
        form.function_area || null,
        form.location || null,
        form.employment_type || null,
        form.experience_min || null,
        form.experience_max || null,
        form.salary_min || null,
        form.salary_max || null,
        form.hide_salary ? 1 : 0,
        form.vacancies || 1,
        form.education || null,
        form.industry || null,
        form.responsibilities || null,
        form.qualifications || null,
        JSON.stringify(form.description || ''), 
        JSON.stringify(form.skills || []),
        JSON.stringify(form.labels || []),
        JSON.stringify(form.questions || []),
        JSON.stringify(form.walkin_details || null),
        form.receive_matching_email ? 1 : 0,
        form.share_with_subusers ? 1 : 0,
        req.user?.userId || "2"
      ]
    );

    res.status(201).json({ message: 'Job created successfully', jobId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating job' });
  }
};


export const getAllJobs = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        j.id,
        j.title,
        c.name AS company,
        COALESCE(c.logo_url, '/uploads/logos/default-logo.png') AS logo, -- Fetch logo_url from companies
        j.location,
        CONCAT('$', FORMAT(j.salary_min, 0), '-$', FORMAT(j.salary_max, 0)) AS salary,
        j.employment_type AS type,
        JSON_UNQUOTE(j.description) AS description -- Parse JSON description
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      ORDER BY j.created_at DESC
    `);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Error fetching jobs", error: error.message });
  }
};

export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

   const [rows] = await pool.query(`
  SELECT 
    j.id,
    j.title,
    c.name AS company,
    COALESCE(c.logo_url, '/uploads/logos/default-logo.png') AS logo,
    j.location,
    CONCAT('$', FORMAT(j.salary_min, 0), '-$', FORMAT(j.salary_max, 0)) AS salary,
    j.employment_type AS type,
    JSON_UNQUOTE(j.description) AS description,
    j.responsibilities,
    j.education,
    j.qualification_category,
    j.qualification_subcategory,
    COALESCE(i.name, 'General') AS category
  FROM jobs j
  LEFT JOIN companies c ON j.company_id = c.id
  LEFT JOIN industries i ON j.industry_id = i.id
  WHERE j.id = ?
`, [id]);


    if (rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    const job = {
      ...rows[0],
      responsibilities: rows[0].responsibilities || '',
      qualifications: rows[0].qualifications || '',
      description: rows[0].description ? JSON.parse(rows[0].description).html || '' : '',
    };

    res.status(200).json(job);
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({ message: "Error fetching job", error: error.message });
  }
};




// controllers/companyController.js
import pool from "../config/db.js";

// ✅ Create company
export const createCompany = async (req, res) => {
  try {
    const {
      name,
      industry,
      location,
      about,
      website,
      email,
      phone,
      description,
      established,
      headquarters,
      employeeSize,
      logo,
      socialLinks,
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO companies 
        (name, industry, location, about, website, email, phone, description, established, 
         headquarters, employeeSize, logo, socialLinks) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        industry,
        location,
        about,
        website,
        email,
        phone,
        description,
        established,
        headquarters,
        employeeSize,
        logo,
        JSON.stringify(socialLinks), // store object as JSON
      ]
    );

    const [newCompany] = await pool.query("SELECT * FROM companies WHERE id = ?", [result.insertId]);

    res.status(201).json({
      ...newCompany[0],
      socialLinks: newCompany[0].socialLinks ? JSON.parse(newCompany[0].socialLinks) : {},
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Update company
export const updateCompany = async (req, res) => {
  try {
    const {
      name,
      industry,
      location,
      about,
      website,
      email,
      phone,
      description,
      established,
      headquarters,
      employeeSize,
      logo,
      socialLinks,
    } = req.body;

    await pool.query(
      `UPDATE companies SET 
        name=?, industry=?, location=?, about=?, website=?, email=?, phone=?, 
        description=?, established=?, headquarters=?, employeeSize=?, logo=?, socialLinks=? 
       WHERE id=?`,
      [
        name,
        industry,
        location,
        about,
        website,
        email,
        phone,
        description,
        established,
        headquarters,
        employeeSize,
        logo,
        JSON.stringify(socialLinks),
        req.params.id,
      ]
    );

    const [updatedRows] = await pool.query("SELECT * FROM companies WHERE id=?", [req.params.id]);

    if (updatedRows.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }

    const company = {
      ...updatedRows[0],
      socialLinks: updatedRows[0].socialLinks ? JSON.parse(updatedRows[0].socialLinks) : {},
    };

    res.json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get company
export const getCompany = async (req, res) => {
  try {
    const companyId = Number(req.params.id);
    if (isNaN(companyId)) return res.status(400).json({ message: "Invalid company ID" });

    const [rows] = await pool.query("SELECT * FROM companies WHERE id = ?", [companyId]);

    if (rows.length === 0) return res.status(404).json({ message: "Company not found" });

    const company = {
      ...rows[0],
      socialLinks: rows[0].socialLinks ? JSON.parse(rows[0].socialLinks) : {},
    };

    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

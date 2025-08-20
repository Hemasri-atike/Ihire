import db from "../config/db.js";

// ✅ Get all companies
export const getAllCompanies = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM companies");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get company by ID
export const getCompany = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM companies WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Company not found" });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};








export const createCompany = async (req, res) => {
  try {
    const {
      name, industry, description, established,
      headquarters, employeeSize, location, about,
      website, email, phone, logo, socialLinks
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO companies 
      (name, industry, description, established, headquarters, employeeSize, location, about, website, email, phone, logo, socialLinks) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, industry, description, established,
        headquarters, employeeSize, location, about,
        website, email, phone, logo,
        JSON.stringify(socialLinks)
      ]
    );

    res.json({ message: "Company created successfully", companyId: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ✅ Create new company
// export const createCompany = async (req, res) => {
//   try {
//     const { name, industry, location, about, website, email, phone } = req.body;

//     const [result] = await db.query(
//       "INSERT INTO companies (name, industry, location, about, website, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)",
//       [name, industry, location, about, website, email, phone]
//     );

//     res.json({ message: "Company created successfully", companyId: result.insertId });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };


export const updateCompany = async (req, res) => {
  try {
    const { name, industry, location, about, website, email, phone } = req.body;

    await db.query(
      "UPDATE companies SET name=?, industry=?, location=?, about=?, website=?, email=?, phone=? WHERE id=?",
      [name, industry, location, about, website, email, phone, req.params.id]
    );

    const [updatedRows] = await db.query("SELECT * FROM companies WHERE id=?", [req.params.id]);

    res.json(updatedRows[0]); // ✅ return updated company
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ✅ Delete company
export const deleteCompany = async (req, res) => {
  try {
    await db.query("DELETE FROM companies WHERE id = ?", [req.params.id]);
    res.json({ message: "Company deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

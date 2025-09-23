import pool from "../config/db.js";

export const createCompany = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      console.error("No user data in request");
      return res.status(401).json({ error: "No user data provided" });
    }

    if (user.role !== "employer") {
      return res.status(403).json({ error: "Only employers can create company profiles" });
    }

    // Check if user already has a company
    const [existingCompany] = await pool.query(
      "SELECT id FROM companies WHERE user_id = ?",
      [user.id]
    );
    if (existingCompany.length > 0) {
      return res.status(400).json({ error: "User already has a company profile" });
    }

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
      socialLinks,
      documentTypes,
    } = req.body;

    console.log("Received socialLinks:", socialLinks, "Type:", typeof socialLinks);
    console.log("Received documentTypes:", documentTypes, "Type:", typeof documentTypes);

    // Parse documentTypes
    let parsedDocumentTypes = [];
    if (documentTypes) {
      try {
        parsedDocumentTypes = Array.isArray(documentTypes)
          ? documentTypes
          : JSON.parse(documentTypes);
      } catch (err) {
        console.error("Error parsing documentTypes:", err.message);
        return res.status(400).json({ error: "Invalid documentTypes format. Must be a JSON array or array." });
      }
    }

    // Process documents
    const documents = req.files?.documents
      ? req.files.documents.map((file, index) => ({
          type: parsedDocumentTypes[index] || "unknown",
          filePath: file.path.replace(/\\/g, "/"),
          status: "pending",
          uploadedAt: new Date().toISOString(),
        }))
      : [];

    const logoPath = req.files?.logo ? req.files.logo[0].path.replace(/\\/g, "/") : null;

    // Validate required fields
    if (!name || !industry || !location) {
      return res.status(400).json({ error: "Name, industry, and location are required" });
    }

    // Parse socialLinks
    let parsedSocialLinks = {};
    if (socialLinks) {
      try {
        parsedSocialLinks = typeof socialLinks === 'string' ? JSON.parse(socialLinks) : socialLinks;
      } catch (err) {
        console.error("Error parsing socialLinks:", err.message);
        return res.status(400).json({ error: "Invalid socialLinks format. Must be a JSON string or object." });
      }
    }

    try {
      const [result] = await pool.query(
        `INSERT INTO companies 
          (name, industry, location, about, website, email, phone, description, established, 
           headquarters, employeeSize, logo, documents, socialLinks, user_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          industry,
          location,
          about || null,
          website || null,
          email || null,
          phone || null,
          description || null,
          established || null,
          headquarters || null,
          employeeSize || null,
          logoPath,
          JSON.stringify(documents),
          JSON.stringify(parsedSocialLinks),
          user.id,
        ]
      );

      const [newCompany] = await pool.query("SELECT * FROM companies WHERE id = ?", [
        result.insertId,
      ]);

      res.status(201).json({
        ...newCompany[0],
        socialLinks: newCompany[0].socialLinks ? JSON.parse(newCompany[0].socialLinks) : {},
        documents: newCompany[0].documents ? JSON.parse(newCompany[0].documents) : [],
      });
    } catch (dbError) {
      if (dbError.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ error: "A company with this email already exists" });
      }
      throw dbError; // Re-throw other database errors
    }
  } catch (error) {
    console.error("Create company error:", error.message);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      console.error("No user data in request");
      return res.status(401).json({ error: "No user data provided" });
    }

    if (user.role !== "employer") {
      return res.status(403).json({ error: "Only employers can update company profiles" });
    }

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
      socialLinks,
      documentTypes,
    } = req.body;

    let parsedDocumentTypes = [];
    if (documentTypes) {
      try {
        parsedDocumentTypes = Array.isArray(documentTypes)
          ? documentTypes
          : JSON.parse(documentTypes);
      } catch (err) {
        console.error("Error parsing documentTypes:", err.message);
        return res.status(400).json({ error: "Invalid documentTypes format" });
      }
    }

    const [existingCompany] = await pool.query("SELECT documents, logo FROM companies WHERE id = ?", [
      req.params.id,
    ]);
    if (existingCompany.length === 0) {
      return res.status(404).json({ message: "Company not found" });
    }

    const existingDocuments = existingCompany[0].documents
      ? JSON.parse(existingCompany[0].documents)
      : [];
    const newDocuments = req.files?.documents
      ? req.files.documents.map((file, index) => ({
          type: parsedDocumentTypes[index] || "unknown",
          filePath: file.path.replace(/\\/g, "/"),
          status: "pending",
          uploadedAt: new Date().toISOString(),
        }))
      : [];

    const documents = [...existingDocuments, ...newDocuments];
    const logoPath = req.files?.logo
      ? req.files.logo[0].path.replace(/\\/g, "/")
      : existingCompany[0].logo;

    await pool.query(
      `UPDATE companies SET 
        name=?, industry=?, location=?, about=?, website=?, email=?, phone=?, 
        description=?, established=?, headquarters=?, employeeSize=?, logo=?, documents=?, socialLinks=? 
       WHERE id=?`,
      [
        name,
        industry,
        location,
        about || null,
        website || null,
        email || null,
        phone || null,
        description || null,
        established || null,
        headquarters || null,
        employeeSize || null,
        logoPath,
        JSON.stringify(documents),
        socialLinks ? JSON.stringify(JSON.parse(socialLinks)) : "{}",
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
      documents: updatedRows[0].documents ? JSON.parse(updatedRows[0].documents) : [],
    };

    res.json(company);
  } catch (err) {
    console.error("Update company error:", err.message);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

export const getCompanyProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      console.error("No user data in request");
      return res.status(401).json({ error: "No user data provided" });
    }

    if (user.role !== "employer") {
      return res.status(403).json({ error: "Only employers can access company profiles" });
    }

    const [rows] = await pool.query("SELECT * FROM companies WHERE user_id = ?", [user.id]);

    if (rows.length === 0) return res.status(404).json({ message: "Company not found" });

    const company = {
      ...rows[0],
      socialLinks: rows[0].socialLinks ? JSON.parse(rows[0].socialLinks) : {},
      documents: rows[0].documents ? JSON.parse(rows[0].documents) : [],
    };

    res.json(company);
  } catch (error) {
    console.error("Get company profile error:", error.message);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

export const getCompany = async (req, res) => {
  try {
    const companyId = Number(req.params.id);
    if (isNaN(companyId)) return res.status(400).json({ message: "Invalid company ID" });

    const [rows] = await pool.query("SELECT * FROM companies WHERE id = ?", [companyId]);

    if (rows.length === 0) return res.status(404).json({ message: "Company not found" });

    const company = {
      ...rows[0],
      socialLinks: rows[0].socialLinks ? JSON.parse(rows[0].socialLinks) : {},
      documents: rows[0].documents ? JSON.parse(rows[0].documents) : [],
    };

    res.json(company);
  } catch (error) {
    console.error("Get company error:", error.message);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};
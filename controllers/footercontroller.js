import pool from "../config/db.js"; // your MySQL connection



// ✅ Post footer section
export const createFooterSection = async (req, res) => {
  try {
    const { section_name, links } = req.body;

    if (!section_name || !links) {
      return res.status(400).json({ error: "section_name and links are required" });
    }

    await pool.query(
      "INSERT INTO footer_sections (section_name, links, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
      [section_name, JSON.stringify(links)]
    );

    res.json({ message: "Footer section created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
function safeParse(value) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value; // fallback if not valid JSON
    }
  }
  return value; // already object/array
}

// GET /api/footer
export const getFooter = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM footer_sections");

    const footerData = {};

    // Map every row into {name, path}
    rows.forEach((row) => {
      let links = safeParse(row.links);

      links = (Array.isArray(links) ? links : []).map((item) =>
        typeof item === "string" ? { name: item, path: "#" } : item
      );

      footerData[row.section_name] = links;
    });

    res.json({ data: footerData });
  } catch (err) {
    res.status(500).json({
      error: "Error fetching footer",
      details: err.message,
    });
  }
};





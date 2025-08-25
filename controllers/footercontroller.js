// Simulated in-memory footer storage
let footerData = {
  candidates: [
    "Browse Jobs",
    "Browse Categories",
    "Candidate Dashboard",
    "Job Alerts",
    "My Bookmarks",
  ],
  employers: [
    "Browse Candidates",
    "Employer Dashboard",
    "Add Job",
    "Job Packages",
  ],
  about: ["About Us", "Job Page Invoice", "Terms Page", "Blog", "Contact"],
};

// GET /api/footer
const getFooter = async (req, res) => {
  try {
    res.json({ data: footerData });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error fetching footer", details: err.message });
  }
};

// POST /api/footer -> replace entire footer object
const createFooter = async (req, res) => {
  try {
    const newFooter = req.body;

    if (typeof newFooter !== "object" || Array.isArray(newFooter)) {
      return res
        .status(400)
        .json({ error: "Invalid payload. Provide an object with sections." });
    }

    footerData = newFooter; // replace entire footer data
    res.json({
      message: "Footer data replaced successfully",
      data: footerData,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error creating footer", details: err.message });
  }
};

// PUT /api/footer/:section -> update a specific section only
const updateFooter = async (req, res) => {
  try {
    const { section } = req.params;
    const { links } = req.body;

    if (!footerData[section]) {
      return res.status(404).json({ error: `Section '${section}' not found` });
    }

    if (!Array.isArray(links)) {
      return res
        .status(400)
        .json({ error: "Invalid payload. Provide 'links' as an array." });
    }

    footerData[section] = links;
    res.json({
      message: `Footer section '${section}' updated successfully`,
      data: footerData,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Error updating footer", details: err.message });
  }
};

export default { getFooter, createFooter, updateFooter };

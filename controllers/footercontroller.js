// Simulated in-memory footer storage for simplicity
let footerData = {
  candidates: [
    "Browse Jobs",
    "Browse Categories",
    "Candidate Dashboard",
    "Job Alerts",
    "My Bookmarks",
  ],
  employers: ["Browse Candidates", "Employer Dashboard", "Add Job", "Job Packages"],
  about: ["About Us", "Job Page Invoice", "Terms Page", "Blog", "Contact"],
};

const getFooter = async (req, res) => {
  try {
    res.json({ data: footerData });
  } catch (err) {
    res.status(500).json({ error: "Error fetching footer", details: err.message });
  }
};

// POST new footer data
const createFooter = async (req, res) => {
  try {
    const { section, links } = req.body; // section: "candidates", "employers", "about"
    if (!section || !links || !Array.isArray(links)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    footerData[section] = links;
    res.json({ message: "Footer section added/updated successfully", data: footerData });
  } catch (err) {
    res.status(500).json({ error: "Error creating footer", details: err.message });
  }
};

// PUT /api/footer/:section to update a specific section
const updateFooter = async (req, res) => {
  try {
    const { section } = req.params; // section: "candidates", "employers", "about"
    const { links } = req.body;

    if (!footerData[section]) {
      return res.status(404).json({ error: "Section not found" });
    }

    if (!links || !Array.isArray(links)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    footerData[section] = links;
    res.json({ message: `Footer section '${section}' updated successfully`, data: footerData });
  } catch (err) {
    res.status(500).json({ error: "Error updating footer", details: err.message });
  }
};

export default { getFooter, createFooter, updateFooter };

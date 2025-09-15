import { getResumeByUserId, saveOrUpdateResume } from "../controllers/models/resume.js";

export const getResume = async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }


    const resume = await getResumeByUserId(userId);
    if (!resume) {
      return res.status(404).json({ message: "No resume found for this user" });
    }

    res.json(resume);
  } catch (err) {
    res.status(500).json({ message: "Server error while fetching resume" });
  }
};

export const updateResume = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const resumeData = req.body;
    if (!resumeData || typeof resumeData !== "object") {
      return res.status(400).json({ message: "Invalid resume data provided" });
    }

    console.log("👉 Updating resume for userId:", userId);


    if (!resumeData.personalInfo || !Array.isArray(resumeData.personalInfo) || resumeData.personalInfo.length !== 1) {
      return res.status(400).json({ message: "Personal Information must have exactly one entry" });
    }

    const { personalInfo } = resumeData;
    if (!personalInfo[0].fullName || !personalInfo[0].email) {
      return res.status(400).json({ message: "Full Name and Email are required in Personal Information" });
    }

    const updatedResume = await saveOrUpdateResume(userId, resumeData);
    if (!updatedResume) {
      return res.status(400).json({ message: "Could not save or update resume" });
    }

    res.json(updatedResume);
  } catch (err) {
    console.error("❌ Resume update error:", err.message);
    res.status(500).json({ message: "Server error while updating resume" });
  }
};
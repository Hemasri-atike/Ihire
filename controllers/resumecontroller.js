import { getResumeByUserId, saveOrUpdateResume } from "../controllers/models/resume.js";

// ✅ Get logged-in user's resume
export const getResume = async (req, res) => {
  try {
    const userId = req.user.id; // from authenticate middleware
    const resume = await getResumeByUserId(userId);
    if (!resume) return res.status(404).json({ message: "No resume found" });
    res.json(resume);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// // ✅ Update logged-in user's resume
// export const updateResume = async (req, res) => {
//   try {
//     const userId = req.user.id; // from authenticate middleware
//     const resumeData = req.body; // ✅ direct body, no wrapping

//     const updatedResume = await saveOrUpdateResume(userId, resumeData);
//     res.json(updatedResume);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
export const updateResume = async (req, res) => {
  try {
    const userId = req.user.id;
    const resumeData = req.body.resumeData; 

    console.log("👉 userId:", userId);
    console.log("👉 resumeData:", JSON.stringify(resumeData, null, 2));

    const updatedResume = await saveOrUpdateResume(userId, resumeData);

    if (!updatedResume) {
      return res.status(400).json({ message: "Could not save resume" });
    }

    res.json(updatedResume);
  } catch (err) {
    console.error("❌ Resume update error:", err);
    res.status(500).json({ message: err.message });
  }
};


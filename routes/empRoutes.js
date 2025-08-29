import express from "express";
import pool from "../config/db.js"
import {
  uploadResume,
  createEmployee,
  getEmployeeById,
  addEmployeeSkill,
  getEmployeeSkills,
  addEmployeeEducation,
  getEmployeeEducation,
  addEmployeeExperience,
  getEmployeeExperience,
  addEmployeeCertification,
  getEmployeeCertifications
} from "../controllers/empcontroller.js";

const router = express.Router();

// Employee
router.post("/", createEmployee);
router.get("/:id", getEmployeeById);

// Resume
router.post("/upload-resume/:id", uploadResume);

// Skills
router.get("/:id/skills", getEmployeeSkills);
router.post("/:id/skills", addEmployeeSkill);

// Education
router.get("/:id/education", getEmployeeEducation);
router.post("/:id/education", addEmployeeEducation);

// Experience
router.get("/:id/experience", getEmployeeExperience);
router.post("/:id/experience", addEmployeeExperience);

// Certifications
router.get("/:id/certifications", getEmployeeCertifications);
router.post("/:id/certifications", addEmployeeCertification);
// Get all employees
router.get("/", async (req, res) => {
  try {
    const [employees] = await pool.execute("SELECT * FROM employees");
    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});
// Get employee by ID
router.get("/:id", getEmployeeById);


export default router;

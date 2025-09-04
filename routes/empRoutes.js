// src/routes/emproutes.js
import express from "express";
import {
  uploadResume,
  createEmployee,
  getEmployeeById,
  getAllEmployees,
  addEmployeeSkill,
  deleteEmployeeSkill,
  getEmployeeSkills,
  addEmployeeEducation,
  deleteEmployeeEducation,
  getEmployeeEducation,
  addEmployeeExperience,
  deleteEmployeeExperience,
  getEmployeeExperience,
  addEmployeeCertification,
  deleteEmployeeCertification,
  getEmployeeCertifications,
} from "../controllers/empcontroller.js";
import authenticate from "../middleware/auth.js";

const router = express.Router();


// Employee Routes
router.post("/", authenticate, createEmployee);
router.get("/:id", authenticate, getEmployeeById);
router.get("/employee", authenticate, getAllEmployees);

// Resume
router.post("/upload-resume/:id", authenticate, uploadResume);

// Skills
router.get("/:id/skills", authenticate, getEmployeeSkills);
router.post("/:id/skills", authenticate, addEmployeeSkill);
router.delete("/:id/skills/:skill", authenticate, deleteEmployeeSkill);

// Education
router.get("/:id/education", authenticate, getEmployeeEducation);
router.post("/:id/education", authenticate, addEmployeeEducation);
router.delete("/:id/education/:educationId", authenticate, deleteEmployeeEducation);

// Experience
router.get("/:id/experience", authenticate, getEmployeeExperience);
router.post("/:id/experience", authenticate, addEmployeeExperience);
router.delete("/:id/experience/:experienceId", authenticate, deleteEmployeeExperience);

// Certifications
router.get("/:id/certifications", authenticate, getEmployeeCertifications);
router.post("/:id/certifications", authenticate, addEmployeeCertification);
router.delete("/:id/certifications/:cert_name", authenticate, deleteEmployeeCertification);

export default router;
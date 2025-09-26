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
   updateEmployee
} from "../controllers/empcontroller.js";
import authenticate from "../middleware/auth.js";

const router = express.Router();


router.post("/", authenticate, createEmployee);
router.get("/:id", authenticate, getEmployeeById);
router.get("/employee", authenticate, getAllEmployees);

router.post("/upload-resume/:id", authenticate, uploadResume);

router.get("/:id/skills", authenticate, getEmployeeSkills);
router.post("/:id/skills", authenticate, addEmployeeSkill);
router.delete("/:id/skills/:skill", authenticate, deleteEmployeeSkill);

router.get("/:id/education", authenticate, getEmployeeEducation);
router.post("/:id/education", authenticate, addEmployeeEducation);
router.delete("/:id/education/:educationId", authenticate, deleteEmployeeEducation);

router.get("/:id/experience", authenticate, getEmployeeExperience);
router.post("/:id/experience", authenticate, addEmployeeExperience);
router.delete("/:id/experience/:experienceId", authenticate, deleteEmployeeExperience);

router.get("/:id/certifications", authenticate, getEmployeeCertifications);
router.post("/:id/certifications", authenticate, addEmployeeCertification);
router.delete("/:id/certifications/:cert_name", authenticate, deleteEmployeeCertification);



router.put("/:id", authenticate, updateEmployee);

export default router;
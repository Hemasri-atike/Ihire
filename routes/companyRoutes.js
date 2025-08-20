import express from "express";
import {
  getAllCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany
} from "../controllers/companycontroller.js";

const router = express.Router();

router.get("/", getAllCompanies);       // ✅ List all companies
router.get("/:id", getCompany);         // ✅ Get one company
router.post("/", createCompany);        // ✅ Create new company
router.put("/:id", updateCompany);      // ✅ Update company
router.delete("/:id", deleteCompany);   // ✅ Delete company

export default router;

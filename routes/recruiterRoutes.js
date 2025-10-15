import express from "express";
import {  updateRecruiter, getRecruiter, recruiterCompanyRegister, recruiterRegister, getRecruiterCompany, recruiterLogin, recruiterCompanies } from "../controllers/recruiterControllers.js";

const router = express.Router();

router.post("/register", recruiterRegister);
router.post("/company", recruiterCompanyRegister);
router.get("/:userId", getRecruiter)
router.patch("/update-user",updateRecruiter);
router.post('/login',  recruiterLogin )
router.get ("/getemployercompany", getRecruiterCompany)
router.get("/:userId/companies",recruiterCompanies)
export default router;
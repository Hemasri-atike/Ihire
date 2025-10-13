import express from "express";
import {  updateRecruiter, getRecruiter, recruiterCompanyRegister, recruiterRegister, getRecruiterCompany, RecruiterLogin } from "../controllers/recruiterControllers.js";

const router = express.Router();

router.post("/register", recruiterRegister);
router.post("/company", recruiterCompanyRegister);
router.get("/:userId", getRecruiter)
router.patch("/update-user",updateRecruiter);
router.post('/login',  RecruiterLogin )
router.get ("/getemployercompany", getRecruiterCompany)
export default router;
import express from "express";
import { employerCompanyRegister, employerRegister,  getEmployer, userUpdate,getEmployerCompany, getEmployerLogin } from "../controllers/employerControllers.js";

const router = express.Router();

router.post("/register", employerRegister);
router.post("/company", employerCompanyRegister);
router.get("/:userId", getEmployer)
router.patch("/update-user",userUpdate);
router.post('/login', getEmployerLogin)

router.get ("/getemployercompany",getEmployerCompany)
export default router;
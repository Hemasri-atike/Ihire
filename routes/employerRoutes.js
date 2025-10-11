import express from "express";
import { employerCompanyRegister, employerRegister,  getEmployer, userUpdate } from "../controllers/employerControllers.js";

const router = express.Router();

router.post("/register", employerRegister);
router.post("/company", employerCompanyRegister);
router.get("/:userId", getEmployer)
router.patch("/update-user",userUpdate)

export default router;
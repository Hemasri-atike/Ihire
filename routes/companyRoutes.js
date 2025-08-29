import express from "express";
import { getCompany, updateCompany ,createCompany} from "../controllers/companyController.js";

const router = express.Router();

router.get("/:id", getCompany);
router.put("/:id", updateCompany);
router.post("/", createCompany);

export default router;
 
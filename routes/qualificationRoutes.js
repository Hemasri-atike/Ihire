import express from "express";
import { getQualifications }  from "../controllers/qualificationController.js";

const router = express.Router();
router.get("/", getQualifications);
export default router;

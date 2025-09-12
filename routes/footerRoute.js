import express from "express";
import { getFooter, createFooterSection } from "../controllers/footercontroller.js";

const router = express.Router();

router.get("/", getFooter);
router.post("/", createFooterSection);

export default router;

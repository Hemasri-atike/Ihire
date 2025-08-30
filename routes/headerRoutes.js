import express from "express";
import { getHeader, createHeader } from "../controllers/headercontroller.js";

const router = express.Router();

// GET header
router.get("/", getHeader);

// POST header
router.post("/", createHeader);


export default router;

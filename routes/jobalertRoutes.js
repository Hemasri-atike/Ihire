import express from "express";
import {
  getJobAlerts,
  getJobAlertById,
  createJobAlert,
  updateJobAlert,
  deleteJobAlert,
} from "../controllers/jobalertController.js";
import authenticate from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticate, getJobAlerts);          // Candidates & employees
router.get("/:id", authenticate, getJobAlertById);    // Candidates & employees
router.post("/", authenticate, createJobAlert);       // Employee only
router.put("/:id", authenticate, updateJobAlert);     // Employee only
router.delete("/:id", authenticate, deleteJobAlert);  // Employee only

export default router;

// routes/applicationRoutes.js
import express from "express";
import applicationController from "../controllers/applicationcontroller.js";
import authenticate from "../middleware/auth.js";

const router = express.Router();

router.post("/", authenticate, applicationController.apply);
router.get("/my-applications", authenticate, applicationController.getUserApplications);

export default router;
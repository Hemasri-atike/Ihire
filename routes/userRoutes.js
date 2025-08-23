import express from "express";
import userController from "../controllers/userController.js";
import authenticate from "../middleware/auth.js";

const router = express.Router();

// Register a new user
router.post("/register", userController.register);

// Login user
router.post("/login", userController.login);

// Get all users (Admin only)
router.get("/",  userController.getUsers);

export default router;

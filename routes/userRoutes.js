import express from "express";
import userController from "../controllers/usercontroller.js";

const router = express.Router();

router.post("/register", userController.register);
router.post("/login", userController.login);
router.get("/", userController.getUsers); // Admin only

export default router;

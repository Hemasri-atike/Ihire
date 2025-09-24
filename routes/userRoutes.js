import express from "express";
import userController from "../controllers/usercontroller.js";

const router = express.Router();

router.post("/register", userController.register);
router.post("/login", userController.login);
router.get("/me", userController.getUsers); 
router.get('/profile', userController.getProfile);
router.post("/forgot-password", userController.forgotPassword);


export default router;

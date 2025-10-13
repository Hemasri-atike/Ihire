import express from "express";
import userController from "../controllers/usercontroller.js";

const router = express.Router();

// router.post("/register", userController.candidateRegister);
// router.post("/login", userController.candidateLogin);
router.get("/me", userController.getUsers); 
router.get('/profile', userController.getProfile);
router.post("/forgot-password", userController.forgotPassword);


export default router;

import express from "express";
import userController from "../controllers/userController.js";

const router = express.Router();

router.post("/register", userController.register);
router.post("/login", userController.login);
router.get("/register", (req, res) => {
  res.status(405).json({ error: "Method Not Allowed", message: "Use POST to register a user" });
});

export default router;
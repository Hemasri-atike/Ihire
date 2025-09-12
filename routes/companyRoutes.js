import express from "express";
import multer from "multer";
import { getCompany, updateCompany, createCompany } from "../controllers/companyController.js";

const router = express.Router();

// Multer storage setup
const storage = multer.diskStorage({
  destination: "uploads/", // make sure this folder exists
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// Routes
router.get("/:id", getCompany);
router.put("/:id", upload.single("logo"), updateCompany);
router.post("/profile", upload.single("logo"), createCompany); // ✅ handle multipart/form-data

export default router;

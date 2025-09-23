import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  getCompany,
  updateCompany,
  createCompany,
  getCompanyProfile,
} from "../controllers/companyController.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "logo") {
      cb(null, path.join(__dirname, "../Uploads/logos"));
    } else if (file.fieldname === "documents") {
      cb(null, path.join(__dirname, "../Uploads/documents"));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    fieldSize: 25 * 1024 * 1024, // 25MB for non-file fields
    fields: 20, // Allow up to 20 non-file fields
    files: 6, // Allow up to 6 files (1 logo + 5 documents)
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|jpg|jpeg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, JPEG, and PNG files are allowed"), false);
    }
  },
}).fields([
  { name: "logo", maxCount: 1 },
  { name: "documents", maxCount: 5 },
]);

router.get("/", getCompany);
router.post("/", upload, createCompany);
router.put("/:id", upload, updateCompany);
router.get("/profile", getCompanyProfile);

export default router;
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";
import authenticate from "./middleware/auth.js";
import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

// Routes
import headerRoutes from "./routes/headerRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import dashboardRoutes from "./routes/dashboardroutes.js";
import candidateRoutes from "./routes/candidateroute.js";
import candidateResumeRoutes from "./routes/resumeRoutes.js";
import jobAlertRoutes from "./routes/jobalertRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import footerRoute from "./routes/footerRoute.js";
import profileRoutes from "./routes/profileRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import empRoutes from "./routes/empRoutes.js";



import industryRoutes from "./routes/industryRoutes.js"
import employerRoutes from "./routes/recruiterRoutes.js"
import jobDetailsRoutes from "./routes/jobDetailsRoutes.js"
import invitesRoutes from "./routes/invitesRoutes.js"
dotenv.config();

// Configure __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create upload directories
const uploadDirs = [
  path.join(__dirname, "Uploads/resumes"),
  path.join(__dirname, "Uploads/coverLetters"),
  path.join(__dirname, "Uploads/logos"),
  path.join(__dirname, "Uploads/documents"),
];
uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "resume") {
      cb(null, path.join(__dirname, "Uploads/resumes"));
    } else if (file.fieldname === "coverLetter") {
      cb(null, path.join(__dirname, "Uploads/coverLetters"));
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, and DOCX files are allowed for resumes and cover letters"), false);
    }
  },
});

const app = express();

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000","http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE","PATCH"],
       credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "Uploads"))); // Serve uploaded files

app.get("/", (req, res) => res.send("Job Portal Backend running"));

// Routes
app.use("/api/header", headerRoutes);
app.use("/api/users", userRoutes);
app.use('/api/invites',invitesRoutes);


app.use(
  "/api/applications",
  authenticate,
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "coverLetter", maxCount: 1 },
  ]),
  applicationRoutes
);



app.use("/api/employer",employerRoutes)
app.use("/api/jobs",jobDetailsRoutes)
app.use("/api/industries", industryRoutes);








// app.use("/api", applicantRoutes);
app.use("/api/companies",  companyRoutes);
app.use("/api/dashboard", authenticate, dashboardRoutes);
app.use("/api/candidates", authenticate, candidateRoutes);
app.use("/api/candidates/resume", authenticate, candidateResumeRoutes);
app.use("/api/jobalerts", authenticate, jobAlertRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/footer", footerRoute);
app.use("/api/profile",  profileRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/employees", authenticate, empRoutes);



// Global error handler
app.use((err, req, res, next) => {
  console.error(`Error: ${req.method} ${req.url}`, err.stack);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

// Catch-all for unmatched routes
app.use((req, res) => {
  console.error(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: "Not Found", details: "Route does not exist" });
});

// Test database connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("MySQL connected successfully");
    connection.release();
  } catch (err) {
    console.error("MySQL connection failed:", err.message);
    process.exit(1);
  }
})();

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
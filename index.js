
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

// Routes
import headerRoutes from "./routes/headerRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import applicantRoutes from "./routes/applicant.js";
import companyRoutes from "./routes/companyRoutes.js";
import dashboardroutes from "./routes/dashboardroutes.js";
import candidateRoutes from "./routes/candidateroute.js";
import candidateResumeRoutes from "./routes/resumeRoutes.js";
import jobAlertRoutes from "./routes/jobalertRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import footerRoute from "./routes/footerRoute.js";
import profileRoutes from "./routes/profileRoutes.js";


const app = express();

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json()); // <-- important to parse JSON bodies

// Test route
app.get("/", (req, res) => res.send("Job Portal Backend running"));

// Header routes
app.use("/api/header", headerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/application", applicationRoutes);
app.use("/api/applicants", applicantRoutes);
app.use("/api/companies", companyRoutes); 
app.use("/api/dashboard", dashboardroutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/candidates/resume", candidateResumeRoutes); 
app.use("/api/jobalerts", jobAlertRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/footer", footerRoute);

app.use("/api/profile", profileRoutes);
// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

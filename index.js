import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import applicantRoutes from "./routes/applicant.js";
import companyRoutes from "./routes/companyRoutes.js";

dotenv.config();

const app = express();

//  Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = ["http://localhost:3000", "http://localhost:5173"];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Test Route
app.get("/", (req, res) => {
  res.send("Job Portal Backend running");
});

//  Routes
app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/application", applicationRoutes);
app.use("/api/applicants", applicantRoutes);
app.use("/api/companies", companyRoutes); // ✅ FIXED

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

// ✅ Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

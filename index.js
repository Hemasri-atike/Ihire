import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";

dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:5173" })); 
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Job Portal Backend running 🚀");
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
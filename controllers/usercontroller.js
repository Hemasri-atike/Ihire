// controllers/userController.js
import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userController = {
  async register(req, res) {
    try {
      const { name, email, password, role, mobile, company_name, position } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }
      if (role === "employer" && (!company_name || !position)) {
        return res.status(400).json({ error: "Company name and position are required for employers" });
      }
      if (role === "job_seeker" && !mobile) {
        return res.status(400).json({ error: "Mobile number is required for job seekers" });
      }

      const [existingUsers] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
      if (existingUsers.length > 0) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        "INSERT INTO users (name, email, password, role, mobile, company_name, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, email, hashedPassword, role || "job_seeker", mobile || null, company_name || null, position || null]
      );

      res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
      console.error("Error in register:", err.message, err.stack);
      res.status(500).json({ error: "Server error", details: err.message });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

      if (users.length === 0) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const user = users[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "your_jwt_secret",
        { expiresIn: "1h" }
      );

      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, mobile: user.mobile, company_name: user.company_name, position: user.position } });
    } catch (err) {
      console.error("Error in login:", err.message, err.stack);
      res.status(500).json({ error: "Server error", details: err.message });
    }
  },

  async getUsers(req, res) {
    try {
      const [users] = await pool.query("SELECT id, name, email, role, mobile, company_name, position FROM users");
      res.json(users);
    } catch (err) {
      console.error("Error in getUsers:", err.message, err.stack);
      res.status(500).json({ error: "Server error", details: err.message });
    }
  },
};

export default userController;
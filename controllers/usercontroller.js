import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userController = {
  async register(req, res) {
    try {
      const { name, email, password, role, mobile, company_name } = req.body;

      if (!name || !password || !mobile || !email) {
        return res.status(400).json({ error: "Name, email, mobile, and password are required" });
      }

      const [existingUsers] = await pool.query(
        "SELECT * FROM users WHERE mobile = ? OR email = ?",
        [mobile, email]
      );
      if (existingUsers.length > 0) {
        return res.status(400).json({ error: "Mobile or email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [userResult] = await pool.query(
        "INSERT INTO users (name, email, password, role, mobile, company_name) VALUES (?, ?, ?, ?, ?, ?)",
        [name, email, hashedPassword, role || "job_seeker", mobile, company_name || null]
      );

      const userId = userResult.insertId;

      let employeeId = null;
      if (role === "job_seeker" || !role) {
        const [employeeResult] = await pool.query(
          "INSERT INTO employees (full_name, email, phone, user_id) VALUES (?, ?, ?, ?)",
          [name, email, mobile, userId]
        );
        employeeId = employeeResult.insertId;
      }

      const [newUserRows] = await pool.query(
        "SELECT id, name, email, role, mobile, company_name FROM users WHERE id = ?",
        [userId]
      );

      const token = jwt.sign(
        { id: newUserRows[0].id, role: newUserRows[0].role },
        process.env.JWT_SECRET || "your_jwt_secret",
        { expiresIn: "1d" }
      );

      res.status(201).json({
        message: "User registered successfully",
        token,
        user: newUserRows[0],
        employeeId: employeeId || null,
      });
    } catch (err) {
      console.error("Error in register:", err.message);
      res.status(500).json({ error: "Server error", details: err.message });
    }
  },

async forgotPassword(req, res) {
  const { mobile, newPassword } = req.body;

  if (!mobile || !newPassword) {
    return res.status(400).json({
      success: false,
      error: "Mobile number and new password are required",
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: "New password must be at least 8 characters",
    });
  }

  try {
    // 1️⃣ Check if mobile exists
    const [users] = await pool.query("SELECT id, password FROM users WHERE mobile = ?", [mobile]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Mobile number not found",
      });
    }

    const user = users[0];

    // 2️⃣ Optional: prevent using the same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: "New password cannot be the same as the current password",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query("START TRANSACTION");

    await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user.id]);

    await pool.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
        role: user.role 

    });
  } catch (err) {
    try {
      await pool.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Rollback Error:", rollbackErr.message);
    }

    console.error("Forgot Password Error:", err.message);
    res.status(500).json({
      success: false,
      error: "Server error during password reset",
      details: err.message,
    });
  }
},

async login(req, res) {
  try {
    const { email, password } = req.body;

    const [employers] = await pool.query("SELECT * FROM employers WHERE email = ?", [email]);

    if (employers.length === 0)
      return res.status(400).json({ error: "Invalid credentials" });

    const user = employers[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        email: user.email,
        company_name: user.company_name || null,
      },
    });
  } catch (err) {
    console.error("Error in login:", err.message);
    res.status(500).json({ error: "Server error", details: err.message });
  }
},

  async getUsers(req, res) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "No token provided" });

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
      } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      if (decoded.role !== "admin") return res.status(403).json({ error: "Admins only" });

      const [users] = await pool.query(
        "SELECT id, name, email, role, mobile, company_name, created_at FROM users"
      );
      res.json(users);
    } catch (err) {
      console.error("Error in getUsers:", err.message);
      res.status(500).json({ error: "Server error", details: err.message });
    }
  },

  async getProfile(req, res) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
      } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const [users] = await pool.query(
        "SELECT id, name, email, role, mobile, company_name FROM users WHERE id = ?",
        [decoded.id]
      );
      if (users.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = users[0];
      let employeeProfile = null;

      if (user.role === "job_seeker") {
        const [employeeRows] = await pool.query(
          "SELECT id, full_name, email, phone, user_id FROM employees WHERE user_id = ?",
          [user.id]
        );
        if (employeeRows.length > 0) {
          employeeProfile = employeeRows[0];
        }
      }

      res.json({
        user,
        employeeProfile,
      });
    } catch (err) {
      console.error("Error in getProfile:", err.message);
      res.status(500).json({ error: "Server error", details: err.message });
    }
  },
};

export default userController;
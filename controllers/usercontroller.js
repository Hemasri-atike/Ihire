import pool from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userController = {
//   async candidateRegister  (req, res)  {
//   let connection;
//   try {
//     const { name, email, password } = req.body;
//     connection = await pool.getConnection();

//     const [existingUser] = await connection.query(
//       "SELECT * FROM users WHERE email = ?",
//       [email]
//     );
//     if (existingUser.length > 0) {
//       return res.status(400).json({ error: "Email already exists" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const [result] = await connection.query(
//       "INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, NOW())",
//       [name, email, hashedPassword]
//     );

//     const userId = result.insertId;
//     const [userRows] = await connection.query(
//       "SELECT id, name, email, created_at FROM users WHERE id = ?",
//       [userId]
//     );
//     const user = userRows[0];

//     // Generate JWT token
//     const token = jwt.sign(
//       { id: user.id, email: user.email, role: "candidate" },
//       process.env.JWT_SECRET || "your_jwt_secret",
//       { expiresIn: "1d" }
//     );

//     // Return response
//     res.status(201).json({
//       message: "Candidate registered successfully",
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         created_at: user.created_at,
//       },
//       token,
//     });
//   } catch (error) {
//     console.error("Candidate register error:", error);
//     res.status(500).json({ error: "Something went wrong", details: error.message });
//   } finally {
//     if (connection) connection.release();
//   }
// },

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

// async candidateLogin(req, res) {
//   let connection;
//   try {
//     const { email, password } = req.body;
//     connection = await pool.getConnection();

//     // Query the users table
//     const [users] = await connection.query("SELECT id, name, email, password, created_at FROM users WHERE email = ?", [email]);

//     if (users.length === 0) {
//       return res.status(400).json({ error: "Invalid credentials" });
//     }

//     const user = users[0];

//     // Verify password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ error: "Invalid credentials" });
//     }

//     // Generate JWT token
//     const token = jwt.sign(
//       { id: user.id, email: user.email, role: "candidate" },
//       process.env.JWT_SECRET || "your_jwt_secret",
//       { expiresIn: "1d" }
//     );

//     // Return response
//     res.json({
//       token,
//       user: {
//         id: user.id,
//         full_name: user.name, // Map name to full_name for frontend compatibility
//         email: user.email,
//         role: "candidate", // Hardcode role since users table doesn't have it
//         created_at: user.created_at,
//       },
//     });
//   } catch (err) {
//     console.error("Error in candidate login:", err.message);
//     res.status(500).json({ error: "Server error", details: err.message });
//   } finally {
//     if (connection) connection.release();
//   }
// },


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
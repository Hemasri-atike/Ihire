import jwt from "jsonwebtoken";

const authenticate = (req, res, next) => {
  try {
    // 1️⃣ Get Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization token required" });
    }

    // 2️⃣ Extract token
    const token = authHeader.split(" ")[1];

    // 3️⃣ Verify token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("❌ JWT_SECRET is missing in .env file");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const decoded = jwt.verify(token, secret);

    // 4️⃣ Attach decoded payload to req.user
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || "candidate", // default role
    };

    // ✅ Continue to next middleware/controller
    next();
  } catch (err) {
    console.error("❌ Auth Error:", err.message);
    return res.status(401).json({
      error: "Invalid or expired token",
      details: err.message,
    });
  }
};

export default authenticate;

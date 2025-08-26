import jwt from "jsonwebtoken";

const authenticate = (req, res, next) => {
  try {
    // 1️⃣ Check for Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    // 2️⃣ Extract token
    const token = authHeader.split(" ")[1];

    // 3️⃣ Verify token using secret
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined in .env file");
    }

    const decoded = jwt.verify(token, secret);

    // 4️⃣ Attach user info to request (id, email, role, etc.)
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || "candidate", // default role
    };

    // ✅ Continue to controller
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token", details: err.message });
  }
};

export default authenticate;

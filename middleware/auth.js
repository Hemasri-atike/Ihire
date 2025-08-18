// middleware/auth.js
import jwt from "jsonwebtoken";

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; 
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    req.user = decoded; // Attach user info to request
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export default authenticate;
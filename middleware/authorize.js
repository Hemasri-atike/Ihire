// middleware/authorize.js
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden. You don't have access." });
    }
    next();
  };
};

export default authorize;

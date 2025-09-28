
import jwt from 'jsonwebtoken';

// Middleware to authenticate requests using JWT
const authenticate = (req, res, next) => {
  try {
    // 1️⃣ Get Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(`Authentication failed: Missing or invalid Authorization header`, {
        authHeader: authHeader || 'none',
        path: req.path,
        method: req.method,
      });
      return res.status(401).json({
        error: 'Authentication required',
        details: 'Authorization header with Bearer token is required',
      });
    }

    // 2️⃣ Extract token
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.warn(`Authentication failed: No token provided`, {
        authHeader,
        path: req.path,
        method: req.method,
      });
      return res.status(401).json({
        error: 'Authentication required',
        details: 'No token found in Authorization header',
      });
    }

    // 3️⃣ Verify token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('Authentication failed: JWT_SECRET is not configured', {
        path: req.path,
        method: req.method,
      });
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'JWT secret key is not configured',
      });
    }

    const decoded = jwt.verify(token, secret);

    // 4️⃣ Validate decoded payload
    if (!decoded.id || !decoded.role) {
      console.warn(`Authentication failed: Incomplete token payload`, {
        decoded,
        path: req.path,
        method: req.method,
      });
      return res.status(401).json({
        error: 'Invalid token',
        details: 'Token payload is missing required fields (id or role)',
      });
    }

    // 5️⃣ Attach decoded payload to req.user
    req.user = {
      id: decoded.id,
      email: decoded.email || null,
      role: decoded.role, // Expected roles: 'job_seeker', 'employer', 'admin'
    };

    console.log(`Authenticated user: id=${req.user.id}, role=${req.user.role}`, {
      path: req.path,
      method: req.method,
    });

    // 6️⃣ Continue to next middleware/controller
    next();
  } catch (err) {
    console.error('Authentication error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
    return res.status(401).json({
      error: 'Invalid or expired token',
      details: err.message,
    });
  }
};

export default authenticate;

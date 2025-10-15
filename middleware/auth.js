import jwt from 'jsonwebtoken';


export function getTokenPayload(authorizationHeader) {
  try {
    if (!authorizationHeader) return null;
    // support both "Bearer <token>" and raw token
    const token = (authorizationHeader.split && authorizationHeader.split(' ')[1]) || authorizationHeader;
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('getTokenPayload: JWT_SECRET is not configured');
      return null;
    }
    const decoded = jwt.verify(token, secret);
    // normalize fields similar to middleware: map userId -> id
    if (!decoded) return null;
    return {
      id: decoded.userId ?? decoded.id ?? null,
      email: decoded.email ?? null,
      role: decoded.role ?? null,
      company_id: decoded.company_id ?? null,
      raw: decoded, // keep raw for debugging if needed
    };
  } catch (err) {
  
    return null;
  }
}
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
console.log("decoded",decoded )
    // 4️⃣ Validate decoded payload
    if (!decoded.userId || !decoded.role) { // Changed 'id' to 'userId'
      console.warn(`Authentication failed: Incomplete token payload`, {
        decoded,
        path: req.path,
        method: req.method,
      });
      return res.status(401).json({
        error: 'Invalid token',
        details: 'Token payload is missing required fields (userId or role)',
      });
    }

    // 5️⃣ Attach decoded payload to req.user
    req.user = {
      id: decoded.userId, // Map userId to id for consistency
      email: decoded.email || null,
      role: decoded.role,
      company_id: decoded.company_id || null, // Include company_id for createInvite
    };

    console.log(`Authenticated user: id=${req.user.id}, role=${req.user.role}, company_id=${req.user.company_id}`, {
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
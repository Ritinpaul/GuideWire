import { verifyAdminToken } from '../auth/jwt.js';

/**
 * Admin guard using JWT bearer token.
 */
export default function requireAdmin(req, res, next) {
  const auth = req.header('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin bearer token required',
    });
  }

  try {
    const decoded = verifyAdminToken(token);
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin role required',
      });
    }
    req.admin = decoded;
    next();
  } catch (_err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired admin token',
    });
  }
}

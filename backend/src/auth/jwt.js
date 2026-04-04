import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-me-in-env';
const JWT_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || '8h';

export function signAdminToken(payload = {}) {
  return jwt.sign({ role: 'admin', ...payload }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'gigashield-backend',
    audience: 'gigashield-admin',
  });
}

export function verifyAdminToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'gigashield-backend',
    audience: 'gigashield-admin',
  });
}

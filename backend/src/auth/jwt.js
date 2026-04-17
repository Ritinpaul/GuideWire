import jwt from 'jsonwebtoken';

const JWT_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || '8h';

function getJwtSecret() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error('ADMIN_JWT_SECRET must be set with at least 24 characters');
  }
  return secret;
}

export function signAdminToken(payload = {}) {
  return jwt.sign({ role: 'admin', ...payload }, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'gigashield-backend',
    audience: 'gigashield-admin',
  });
}

export function verifyAdminToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    issuer: 'gigashield-backend',
    audience: 'gigashield-admin',
  });
}

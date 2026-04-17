import { Router } from 'express';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { signAdminToken } from '../auth/jwt.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

const adminLoginRateLimit = createRateLimiter({
  name: 'admin_login',
  windowMs: 10 * 60_000,
  max: 10,
  keyFn: (req) => {
    const username = String(req.body?.username ?? '').trim().toLowerCase();
    return `${req.ip || 'unknown'}:${username}`;
  },
});

const AdminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function safeEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

router.post('/admin/login', adminLoginRateLimit, (req, res) => {
  const parsed = AdminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Username and password are required',
    });
  }

  const { username, password } = parsed.data;
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPass) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Admin credentials are not configured on the server.',
    });
  }

  if (!safeEqual(username, adminUser) || !safeEqual(password, adminPass)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin credentials',
    });
  }

  const token = signAdminToken({ username });
  return res.json({
    success: true,
    token,
    role: 'admin',
  });
});

export default router;

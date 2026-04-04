import { Router } from 'express';
import { z } from 'zod';
import { signAdminToken } from '../auth/jwt.js';

const router = Router();

const AdminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post('/admin/login', (req, res) => {
  const parsed = AdminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Username and password are required',
    });
  }

  const { username, password } = parsed.data;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

  if (username !== adminUser || password !== adminPass) {
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

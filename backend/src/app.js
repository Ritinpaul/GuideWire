/**
 * GIGASHIELD — Backend API Entry Point
 *
 * REST  → http://localhost:3001/api/v1
 * WS    → ws://localhost:3001/ws
 * Health → http://localhost:3001/health
 */
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';

// ── DB & infrastructure ──────────────────────────────────────────────────────
import pool, { probe } from './db/pool.js';
import { initWebSocket } from './ws/broadcast.js';

// ── Middleware ────────────────────────────────────────────────────────────────
import errorHandler from './middleware/errorHandler.js';
import requestContext from './middleware/requestContext.js';

// ── Routers ───────────────────────────────────────────────────────────────────
import workersRouter   from './routes/workers.js';
import policiesRouter  from './routes/policies.js';
import claimsRouter    from './routes/claims.js';
import payoutsRouter   from './routes/payouts.js';
import triggersRouter  from './routes/triggers.js';
import poolsRouter     from './routes/pools.js';
import whatsappRouter  from './routes/whatsapp.js';
import adminRouter     from './routes/admin.js';
import authRouter      from './routes/auth.js';

// ─────────────────────────────────────────────────────────────────────────────
const app  = express();
const port = Number(process.env.PORT ?? 3001);
const nodeEnv = process.env.NODE_ENV ?? 'development';

const corsOriginList = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const devDefaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const allowedOrigins = corsOriginList.length > 0 ? corsOriginList : (nodeEnv === 'production' ? [] : devDefaultOrigins);

function isOriginAllowed(origin) {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

// ── Global middleware ─────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(requestContext);
app.use(cors({
  origin(origin, callback) {
    if (isOriginAllowed(origin)) return callback(null, true);
    return callback(new Error('CORS origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  credentials: false,
}));
app.use(express.json({ limit: '1mb' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    const dbNow = await probe();
    res.json({
      status:    'ok',
      service:   'gigashield-backend',
      version:   '1.0.0',
      db:        'connected',
      db_now:    dbNow,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status:    'degraded',
      service:   'gigashield-backend',
      db:        'unavailable',
      error:     err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/', (_req, res) =>
  res.json({ service: 'GIGASHIELD Backend', version: '1.0.0', docs: '/api/v1' }),
);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/workers',    workersRouter);
app.use('/api/v1/policies',   policiesRouter);
app.use('/api/v1/claims',     claimsRouter);
app.use('/api/v1/payouts',    payoutsRouter);
app.use('/api/v1/triggers',   triggersRouter);
app.use('/api/v1/pools',      poolsRouter);
app.use('/api/v1/whatsapp',   whatsappRouter);
app.use('/api/v1/auth',       authRouter);
app.use('/api/v1/admin',      adminRouter);

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// ── Global error handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

// ── HTTP + WebSocket server ───────────────────────────────────────────────────
const server = createServer(app);
initWebSocket(server);

server.listen(port, () => {
  console.log('');
  console.log('🚀 GIGASHIELD Backend is live');
  console.log(`   REST API  → http://localhost:${port}/api/v1`);
  console.log(`   Health    → http://localhost:${port}/health`);
  console.log(`   WebSocket → ws://localhost:${port}/ws`);
  console.log('');
  console.log('🛣  Routes:');
  console.log('   POST /api/v1/workers/register');
  console.log('   POST /api/v1/policies/subscribe');
  console.log('   POST /api/v1/triggers/inject  ← DEMO MAGIC BUTTON');
  console.log('   POST /api/v1/pools/join');
  console.log('   GET  /api/v1/triggers/dsi/heatmap');
  console.log('');
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down gracefully');
  server.close(() => {
    pool.end(() => {
      console.log('DB pool closed');
      process.exit(0);
    });
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

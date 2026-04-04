/**
 * WebSocket broadcast module.
 *
 * Clients connect to  ws://localhost:3001/ws?role=admin
 *               or    ws://localhost:3001/ws?role=worker&worker_id=<uuid>
 *
 * On TRIGGER_FIRED:
 *   → All admin clients receive the full trigger + claims payload.
 *   → Each affected worker client receives a STORM_MODE event.
 */
import { WebSocketServer } from 'ws';
import { verifyAdminToken } from '../auth/jwt.js';

/** @type {WebSocketServer|null} */
let wss = null;

export function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url      = new URL(req.url, 'http://localhost');
    ws._role      = url.searchParams.get('role') ?? 'admin';
    ws._workerId  = url.searchParams.get('worker_id') ?? null;
    ws.isAlive    = true;

    if (ws._role === 'admin') {
      const token = url.searchParams.get('token');
      if (!token) {
        ws.close(1008, 'Admin token required');
        return;
      }
      try {
        const decoded = verifyAdminToken(token);
        if (decoded.role !== 'admin') {
          ws.close(1008, 'Admin role required');
          return;
        }
        ws._adminUser = decoded.username ?? 'admin';
      } catch (_err) {
        ws.close(1008, 'Invalid admin token');
        return;
      }
    }

    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('error', (err) => console.error('[WS] client error:', err.message));
    ws.on('message', (raw) => {
      // Clients can ping the server
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'PING') ws.send(JSON.stringify({ type: 'PONG' }));
      } catch (_) { /* ignore malformed */ }
    });

    console.log(`[WS] client connected — role=${ws._role} worker_id=${ws._workerId ?? 'n/a'}`);
  });

  // Heartbeat — terminate dead connections every 30s
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on('close', () => clearInterval(heartbeat));
  console.log('[WS] WebSocket server ready on /ws');
}

function _send(ws, type, payload) {
  if (ws.readyState !== 1 /* OPEN */) return;
  try {
    ws.send(JSON.stringify({ type, payload, ts: new Date().toISOString() }));
  } catch (_) { /* client disconnected mid-send */ }
}

/** Broadcast to all connected admin clients. */
export function broadcastToAdmins(type, payload) {
  if (!wss) return;
  wss.clients.forEach((ws) => {
    if (ws._role === 'admin') _send(ws, type, payload);
  });
}

/** Broadcast to a specific worker client by worker_id. */
export function broadcastToWorker(workerId, type, payload) {
  if (!wss) return;
  wss.clients.forEach((ws) => {
    if (ws._role === 'worker' && ws._workerId === workerId) _send(ws, type, payload);
  });
}

/**
 * High-level broadcast used by the trigger pipeline.
 *  - TRIGGER_FIRED → all admins
 *  - STORM_MODE    → each affected worker
 */
export function broadcast(type, payload) {
  broadcastToAdmins(type, payload);

  if (type === 'TRIGGER_FIRED' && Array.isArray(payload.claims)) {
    payload.claims.forEach((c) => {
      broadcastToWorker(c.worker_id, 'STORM_MODE', {
        trigger_id:   payload.trigger_id,
        zone_id:      payload.zone_id,
        trigger_type: payload.type,
        dsi_score:    payload.dsi_score,
        claim_id:     c.claim_id,
        claim_amount: c.claim_amount,
        plan_tier:    c.plan_tier,
        eta_seconds:  180,
      });
    });
  }

  if (type === 'PAYOUT_COMPLETED') {
    broadcastToWorker(payload.worker_id, 'PAYOUT_CONFIRMED', payload);
    broadcastToAdmins('PAYOUT_COMPLETED', payload);
  }
}

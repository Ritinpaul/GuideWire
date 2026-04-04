/**
 * WhatsApp webhook router — /api/v1/whatsapp
 *
 * Receives Twilio WhatsApp webhooks (POST /webhook)
 * and sends TwiML text replies.
 *
 * Twilio sandbox setup:
 *   1. https://console.twilio.com → Messaging → Sandbox for WhatsApp
 *   2. Set webhook URL to: https://YOUR_NGROK_URL/api/v1/whatsapp/webhook
 *   3. WhatsApp users text "join <sandbox-code>" to +1 415 523 8886
 *
 * For local testing with ngrok:
 *   npx ngrok http 3001   →  copy URL → paste in Twilio dashboard
 */
import { Router }        from 'express';
import { handleIncoming } from '../services/whatsappBot.js';

const router = Router();

// Twilio sends form-urlencoded, not JSON
import express from 'express';
router.use(express.urlencoded({ extended: false }));

// ── POST /webhook ─────────────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  const from = req.body?.From ?? '';
  const body = req.body?.Body ?? '';

  console.log(`[WA] ← ${from}: ${body}`);

  try {
    const replyText = await handleIncoming(from, body);
    console.log(`[WA] → ${from}: ${replyText.slice(0, 80)}…`);

    // Respond with TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message><Body>${escapeXml(replyText)}</Body></Message>
</Response>`;

    res.type('text/xml').send(twiml);
  } catch (err) {
    console.error('[WA] handler error:', err);
    const errTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message><Body>Sorry, something went wrong. Reply SHIELD to restart.</Body></Message>
</Response>`;
    res.type('text/xml').send(errTwiml);
  }
});

// ── POST /send (admin-triggered notification) ─────────────────────────────────
// Used by trigger pipeline to push payout notifications
router.post('/send', async (req, res, next) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to + message required' });

  console.log(`[WA Admin] Sending to ${to}: ${message.slice(0, 80)}`);
  // TODO: real Twilio API call here
  res.json({ success: true, to, message, delivered: false, note: 'Twilio credentials required for real delivery' });
});

// ── GET /status ───────────────────────────────────────────────────────────────
router.get('/status', (_req, res) => {
  res.json({
    service:    'GigShield WhatsApp Bot',
    status:     'running',
    flows:      ['SHIELD', 'STATUS', 'PAYOUTS', 'CANCEL'],
    languages:  ['English', 'Hindi', 'Tamil'],
    sandbox:    process.env.TWILIO_SANDBOX_NUMBER ?? 'not configured',
    webhook:    '/api/v1/whatsapp/webhook',
    timestamp:  new Date().toISOString(),
  });
});

// ── GET /demo (simulate WhatsApp conversation) ─────────────────────────────────
router.post('/demo', async (req, res, next) => {
  try {
    const { from = 'demo_user', message = 'SHIELD' } = req.body;
    const reply = await handleIncoming(from, message);
    res.json({ from, message, reply });
  } catch (err) {
    next(err);
  }
});

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default router;

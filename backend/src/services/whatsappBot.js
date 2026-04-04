/**
 * WhatsApp State Machine — conversation flow for GigShield onboarding.
 *
 * States:
 *   INIT → LANGUAGE → NAME → PLATFORM → EARNINGS → SUBSCRIBE → ACTIVE
 *
 * Storage: In-memory Map keyed by phone number (Redis in production).
 * For the hackathon demo, state persists per Node.js process.
 */

import pool from '../db/pool.js';
import { callShieldSAC } from './mlClient.js';

// ── In-memory session store ───────────────────────────────────────────────────
const sessions = new Map();

const PLATFORMS = {
  '1': 'BLINKIT',
  '2': 'ZEPTO',
  '3': 'SWIGGY_INSTAMART',
  '4': 'OTHER',
};

// ── Messages in English + Hindi ───────────────────────────────────────────────
const MSG = {
  greeting: {
    en: `🛡️ *Welcome to GIGASHIELD!*\n\nI protect gig delivery workers from weather & disruption losses.\n\nChoose language:\n1️⃣ English\n2️⃣ हिंदी (Hindi)\n3️⃣ தமிழ் (Tamil)`,
    hi: `🛡️ *GigShield में आपका स्वागत है!*\n\nमैं गिग वर्कर्स को मौसम और व्यवधान से बचाता हूं।\n\nभाषा चुनें:\n1️⃣ English\n2️⃣ हिंदी\n3️⃣ தமிழ்`,
  },
  askName: {
    en: `Great! 👋 What's your name?`,
    hi: `अच्छा! 👋 आपका नाम क्या है?`,
  },
  askPlatform: {
    en: `Which platform do you deliver for?\n1️⃣ Blinkit\n2️⃣ Zepto\n3️⃣ Swiggy Instamart\n4️⃣ Other`,
    hi: `आप किस प्लेटफॉर्म पर डिलीवरी करते हैं?\n1️⃣ Blinkit\n2️⃣ Zepto\n3️⃣ Swiggy Instamart\n4️⃣ अन्य`,
  },
  askEarnings: {
    en: `💰 What are your average daily earnings? (just the number, e.g. 650)`,
    hi: `💰 आपकी औसत दैनिक कमाई कितनी है? (सिर्फ नंबर, जैसे 650)`,
  },
  invalidEarnings: {
    en: `Please enter a valid number for daily earnings (e.g. 500).`,
    hi: `कृपया दैनिक कमाई एक valid संख्या दर्ज करें (जैसे 500)।`,
  },
  subscribePrompt: (name, premium, coverage, lang) => ({
    en: `✅ *${name}, here's your personalised shield:*\n\n💰 Premium: ₹${premium}/week\n🛡️ Coverage: ₹${coverage}\n⚡ Payout in < 3 minutes\n\nReply *YES* to activate or *NO* to cancel.`,
    hi: `✅ *${name}, यह है आपकी shield:*\n\n💰 प्रीमियम: ₹${premium}/सप्ताह\n🛡️ कवरेज: ₹${coverage}\n⚡ भुगतान 3 मिनट में\n\n*YES* टाइप करें activate करने के लिए, *NO* रद्द करने के लिए।`,
  }),
  activated: (name, policyId, lang) => ({
    en: `🎉 *Shield ACTIVATED, ${name}!*\n\nPolicy ID: ${policyId.slice(0,8)}…\n\n✅ You're protected.\n\nCommands:\n📊 STATUS — check your shield\n💸 PAYOUTS — see recent payouts\n❓ HELP — get support`,
    hi: `🎉 *${name}, आपकी Shield ACTIVE है!*\n\nPolicy: ${policyId.slice(0,8)}…\n\n✅ आप सुरक्षित हैं।\n\nकमांड्स:\n📊 STATUS\n💸 PAYOUTS\n❓ HELP`,
  }),
  statusMsg: (policy, dsi, lang) => ({
    en: `🛡️ *Shield Status*\n\nStatus: ${policy.status}\nCoverage: ₹${policy.coverage_amount}\nPremium: ₹${policy.premium_amount}/week\nZone Risk: ${dsi?.level ?? 'NORMAL'} (DSI ${Math.round(dsi?.dsi_score ?? 30)}/100)\n\nExpires: ${new Date(policy.end_date).toLocaleDateString('en-IN')}`,
    hi: `🛡️ *Shield Status*\n\nस्थिति: ${policy.status}\nकवरेज: ₹${policy.coverage_amount}\nप्रीमियम: ₹${policy.premium_amount}/सप्ताह\nZone Risk: ${dsi?.level ?? 'NORMAL'}\n\nExpiry: ${new Date(policy.end_date).toLocaleDateString('en-IN')}`,
  }),
  payoutNotif: (amount, triggerType, lang) => ({
    en: `💸 *PAYOUT CREDITED!*\n\n₹${amount} has been sent to your UPI account.\n\nReason: ${triggerType.replace(/_/g,' ')} disruption.\n\n_Powered by GIGASHIELD ⚡_`,
    hi: `💸 *पेमेंट आ गया!*\n\n₹${amount} आपके UPI account में भेज दिया गया है।\n\nकारण: ${triggerType.replace(/_/g,' ')}\n\n_GIGASHIELD द्वारा ⚡_`,
  }),
  cancelled: {
    en: `👋 No problem! Reply *SHIELD* anytime to restart.`,
    hi: `👋 ठीक है! कभी भी *SHIELD* लिखकर restart करें।`,
  },
  default: {
    en: `🛡️ Reply *SHIELD* to activate protection, *STATUS* to check your policy, or *PAYOUTS* for recent payouts.`,
    hi: `🛡️ *SHIELD* लिखें protection शुरू करने के लिए, *STATUS* अपनी policy देखने के लिए।`,
  },
};

function getLang(session) { return session?.language ?? 'en'; }
function getMsg(msgObj, lang) { return msgObj[lang] ?? msgObj.en; }

// ── Main handler ──────────────────────────────────────────────────────────────
export async function handleIncoming(from, body) {
  const phone = from.replace('whatsapp:', '').replace('+', '');
  const text  = body.trim().toUpperCase();
  let session = sessions.get(phone) ?? { state: 'INIT', phone };

  let reply = '';

  try {
    // ── Global commands ───────────────────────────────────────────
    if (text === 'SHIELD' || text === 'HI' || text === 'HELLO' || text === 'START') {
      session = { state: 'LANGUAGE', phone };
      reply   = getMsg(MSG.greeting, 'en');
      sessions.set(phone, session);
      return reply;
    }

    if (text === 'STATUS') {
      reply = await handleStatus(phone, getLang(session));
      return reply;
    }

    if (text === 'PAYOUTS') {
      reply = await handlePayouts(phone, getLang(session));
      return reply;
    }

    if (text === 'CANCEL' || text === 'NO' || text === 'STOP') {
      sessions.delete(phone);
      return getMsg(MSG.cancelled, getLang(session));
    }

    // ── State machine ─────────────────────────────────────────────
    switch (session.state) {
      case 'LANGUAGE': {
        const langMap = { '1': 'en', '2': 'hi', '3': 'ta' };
        const lang    = langMap[body.trim()] ?? 'en';
        session.language = lang;
        session.state    = 'NAME';
        reply = getMsg(MSG.askName, lang);
        break;
      }

      case 'NAME': {
        session.name  = body.trim();
        session.state = 'PLATFORM';
        reply = getMsg(MSG.askPlatform, getLang(session));
        break;
      }

      case 'PLATFORM': {
        const platform = PLATFORMS[body.trim()] ?? 'OTHER';
        session.platform = platform;
        session.state    = 'EARNINGS';
        reply = getMsg(MSG.askEarnings, getLang(session));
        break;
      }

      case 'EARNINGS': {
        const earnings = parseInt(body.replace(/[^\d]/g, ''), 10);
        if (isNaN(earnings) || earnings < 50 || earnings > 5000) {
          reply = getMsg(MSG.invalidEarnings, getLang(session));
          break;
        }
        session.avg_daily_earnings = earnings;

        // Call Shield-SAC (or mock)
        let premiumInr  = 30;
        let coverageAmt = 3000;
        try {
          const sacResult = await callShieldSAC({ avg_daily_earnings: earnings });
          premiumInr  = Math.round(sacResult.premium_inr ?? 30);
          coverageAmt = sacResult.coverage_amount ?? 3000;
        } catch { /* use defaults */ }

        session.premiumInr  = premiumInr;
        session.coverageAmt = coverageAmt;
        session.state       = 'SUBSCRIBE';

        const promptObj = MSG.subscribePrompt(session.name, premiumInr, coverageAmt, getLang(session));
        reply = getMsg(promptObj, getLang(session));
        break;
      }

      case 'SUBSCRIBE': {
        if (text !== 'YES' && text !== 'HA' && text !== 'HAAN') {
          sessions.delete(phone);
          reply = getMsg(MSG.cancelled, getLang(session));
          break;
        }

        // Register worker + subscribe policy
        const { workerId, policyId } = await registerAndSubscribe(session);
        session.workerId = workerId;
        session.policyId = policyId;
        session.state    = 'ACTIVE';
        sessions.set(phone, session);

        const activatedObj = MSG.activated(session.name, policyId, getLang(session));
        reply = getMsg(activatedObj, getLang(session));
        break;
      }

      case 'ACTIVE':
        reply = getMsg(MSG.default, getLang(session));
        break;

      default:
        session = { state: 'INIT', phone };
        reply   = getMsg(MSG.default, 'en');
    }
  } catch (err) {
    console.error('[WhatsApp Bot] Error:', err.message);
    reply = `Sorry, something went wrong. Reply *SHIELD* to restart. Error: ${err.message}`;
  }

  sessions.set(phone, session);
  return reply;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function registerAndSubscribe(session) {
  // 1. Find or create zone by city (default to first zone)
  const zoneRes = await pool.query(
    `SELECT id FROM zones LIMIT 1`
  );
  const zoneId = zoneRes.rows[0]?.id;
  if (!zoneId) throw new Error('No zones configured in DB');

  // 2. Register worker
  const phone = `+91${session.phone}`;
  const { rows: [existing] } = await pool.query(
    'SELECT id FROM workers WHERE phone = $1', [phone]
  );

  let workerId;
  if (existing) {
    workerId = existing.id;
  } else {
    const { rows: [w] } = await pool.query(
      `INSERT INTO workers (name, phone, city, platform, avg_daily_earnings, language_pref, zone_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7::uuid)
       RETURNING id`,
      [
        session.name,
        phone,
        'Mumbai', // default city
        session.platform ?? 'OTHER',
        session.avg_daily_earnings ?? 400,
        session.language ?? 'en',
        zoneId,
      ]
    );
    workerId = w.id;
  }

  // 3. Subscribe policy
  const startDate = new Date();
  const endDate   = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  const { rows: [policy] } = await pool.query(
    `INSERT INTO policies
       (worker_id, plan_tier, premium_amount, coverage_amount, start_date, end_date, status, upi_id)
     VALUES ($1::uuid, 'MEDIUM', $2, $3, $4, $5, 'ACTIVE', 'whatsapp@upi')
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [workerId, session.premiumInr ?? 30, session.coverageAmt ?? 3000, startDate, endDate]
  );

  return { workerId, policyId: policy?.id ?? 'demo-policy-id' };
}

async function handleStatus(phone, lang) {
  try {
    const norm = `+91${phone}`;
    const { rows: [worker] } = await pool.query(
      'SELECT id, zone_id FROM workers WHERE phone = $1', [norm]
    );
    if (!worker) return `No active shield found. Reply *SHIELD* to sign up.`;

    const { rows: [policy] } = await pool.query(
      `SELECT * FROM policies WHERE worker_id = $1::uuid AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1`,
      [worker.id]
    );
    if (!policy) return `No active policy. Reply *SHIELD* to get protected.`;

    const msgObj = MSG.statusMsg(policy, null, lang);
    return getMsg(msgObj, lang);
  } catch (err) {
    return `Error fetching status: ${err.message}`;
  }
}

async function handlePayouts(phone, lang) {
  try {
    const norm = `+91${phone}`;
    const { rows: [worker] } = await pool.query(
      'SELECT id FROM workers WHERE phone = $1', [norm]
    );
    if (!worker) return `No account found. Reply *SHIELD* to sign up.`;

    const { rows: payouts } = await pool.query(
      `SELECT p.amount, p.status, p.completed_at, c.trigger_id
       FROM payouts p JOIN claims c ON c.id = p.claim_id
       WHERE p.worker_id = $1::uuid ORDER BY p.created_at DESC LIMIT 3`,
      [worker.id]
    );
    if (!payouts.length) return lang === 'hi' ? 'अभी तक कोई payout नहीं।' : 'No payouts yet.';

    const lines = payouts.map(p =>
      `• ₹${p.amount} — ${p.status} — ${p.completed_at ? new Date(p.completed_at).toLocaleDateString('en-IN') : 'Pending'}`
    ).join('\n');

    return lang === 'hi' ? `💸 *पिछले Payouts:*\n${lines}` : `💸 *Recent Payouts:*\n${lines}`;
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

// ── Payout notification (called from triggers.js background job) ──────────────
export async function notifyWorkerPayout(workerPhone, amount, triggerType, lang = 'en') {
  // In production: call Twilio API to send WhatsApp message.
  // For demo: just log it.
  const msgObj = MSG.payoutNotif(amount, triggerType, lang);
  const msg    = getMsg(msgObj, lang);
  console.log(`[WhatsApp] Sending to ${workerPhone}: ${msg.slice(0, 100)}…`);
  // TODO: await twilioClient.messages.create({ from: 'whatsapp:+...', to: `whatsapp:${workerPhone}`, body: msg })
  return msg;
}

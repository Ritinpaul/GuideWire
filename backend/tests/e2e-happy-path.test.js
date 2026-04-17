#!/usr/bin/env node
/**
 * E2E Happy Path (current API contracts)
 * Flow: worker register -> policy subscribe -> admin login -> trigger inject -> claim visible
 */

import assert from 'assert';
import axios from 'axios';

const CONFIG = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  adminUsername: process.env.ADMIN_USERNAME || 'gw_admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'gw_admin_local_change_me',
  timeoutMs: 20_000,
};

const api = axios.create({
  baseURL: `${CONFIG.backendUrl}/api/v1`,
  timeout: CONFIG.timeoutMs,
  headers: { 'Content-Type': 'application/json' },
});

function log(step, details) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${step}`);
  if (details) {
    console.log(details);
  }
}

function makePhone() {
  const suffix = String(Date.now()).slice(-10);
  return `+91${suffix}`;
}

async function run() {
  log('START: E2E happy path');

  const phone = makePhone();

  // 1) Register worker
  log('1/6 Register worker');
  const registerRes = await api.post('/workers/register', {
    name: 'E2E Worker',
    phone,
    city: 'Bangalore',
    platform: 'BLINKIT',
    avg_daily_earnings: 900,
    language_pref: 'en',
  });

  assert.equal(registerRes.status, 201);
  assert.equal(registerRes.data.success, true);
  const workerId = registerRes.data.worker?.id;
  const zoneId = registerRes.data.worker?.zone_id;
  assert.ok(workerId, 'worker id must exist');
  assert.ok(zoneId, 'zone id must exist');

  // 2) Subscribe policy
  log('2/6 Subscribe policy');
  const subscribeRes = await api.post('/policies/subscribe', {
    worker_id: workerId,
    plan_tier: 'MEDIUM',
    upi_id: 'e2e@upi',
    language: 'en',
  });

  assert.equal(subscribeRes.status, 201);
  assert.equal(subscribeRes.data.success, true);
  const policyId = subscribeRes.data.policy?.id;
  assert.ok(policyId, 'policy id must exist');

  // 3) Admin login
  log('3/6 Admin login');
  const authRes = await api.post('/auth/admin/login', {
    username: CONFIG.adminUsername,
    password: CONFIG.adminPassword,
  });

  assert.equal(authRes.status, 200);
  const token = authRes.data?.token;
  assert.ok(token, 'admin token must exist');

  // 4) Inject trigger
  log('4/6 Inject trigger');
  const triggerRes = await api.post(
    '/triggers/inject',
    {
      zone_id: zoneId,
      type: 'HEAVY_RAIN',
      severity_value: 7.2,
      dsi_score: 72,
      source: 'E2E_TEST',
      raw_data: { test: true },
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  assert.equal(triggerRes.status, 201);
  assert.equal(triggerRes.data.success, true);
  assert.ok(triggerRes.data.trigger?.id, 'trigger id must exist');
  assert.ok(
    Number.isInteger(triggerRes.data.claims_created),
    'claims_created should be an integer',
  );

  // 5) Worker claims include this trigger
  log('5/6 Verify worker claims');
  const claimsRes = await api.get(`/workers/${workerId}/claims`);
  assert.equal(claimsRes.status, 200);
  const claims = claimsRes.data?.claims ?? [];
  assert.ok(Array.isArray(claims), 'claims response should be an array');
  assert.ok(claims.length >= 1, 'at least one claim expected after trigger');

  const created = claims.find((c) => c.trigger_id === triggerRes.data.trigger.id);
  assert.ok(created, 'newly created claim should be linked to injected trigger');

  // 6) Active triggers endpoint should include trigger
  log('6/6 Verify active trigger timeline feed');
  const activeRes = await api.get('/triggers/active');
  assert.equal(activeRes.status, 200);
  const triggers = activeRes.data?.triggers ?? [];
  assert.ok(Array.isArray(triggers), 'active triggers should be an array');
  assert.ok(
    triggers.some((t) => t.id === triggerRes.data.trigger.id),
    'injected trigger should appear in /triggers/active',
  );

  log('PASS: E2E happy path completed');
}

run().catch((err) => {
  console.error('FAIL: E2E happy path failed');
  console.error(err?.response?.data || err?.message || err);
  process.exit(1);
});

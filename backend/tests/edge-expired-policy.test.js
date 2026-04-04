/**
 * Edge Case: Expired Policy Handling
 * Ensures workers with expired policies do not get claims created
 */

const axios = require('axios');

const CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3000',
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'admin-test-token'
};

async function testExpiredPolicyHandling() {
  console.log('🧪 Testing Expired Policy Handling...\n');

  let workerId, policyId, triggerId;

  try {
    // Step 1: Create test worker
    console.log('Step 1: Creating test worker...');
    const workerResponse = await axios.post(`${CONFIG.BACKEND_URL}/api/workers/register`, {
      phone: '+919876543210',
      name: 'Test Worker Expired',
      location: 'Mumbai',
      daily_earnings: 400
    });
    workerId = workerResponse.data.worker.id;
    console.log(`✅ Worker created: ${workerId}\n`);

    // Step 2: Create policy with past expiry date
    console.log('Step 2: Creating expired policy...');
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 10); // 10 days ago

    const policyResponse = await axios.post(
      `${CONFIG.BACKEND_URL}/api/admin/policies/create`,
      {
        worker_id: workerId,
        plan_type: 'MEDIUM',
        coverage_amount: 2500,
        premium: 30,
        expiry_date: expiredDate.toISOString(),
        status: 'EXPIRED'
      },
      {
        headers: { 'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}` }
      }
    );
    policyId = policyResponse.data.policy.id;
    console.log(`✅ Expired policy created: ${policyId}\n`);

    // Step 3: Inject trigger
    console.log('Step 3: Injecting trigger for expired policy area...');
    const triggerResponse = await axios.post(
      `${CONFIG.BACKEND_URL}/api/admin/triggers/inject`,
      {
        event_type: 'HEAVY_RAIN',
        location: 'Mumbai',
        dsi_score: 85,
        timestamp: new Date().toISOString()
      },
      {
        headers: { 'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}` }
      }
    );
    triggerId = triggerResponse.data.trigger.id;
    console.log(`✅ Trigger created: ${triggerId}\n`);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Verify no claim was created for expired policy worker
    console.log('Step 4: Checking claims for worker with expired policy...');
    const claimsResponse = await axios.get(
      `${CONFIG.BACKEND_URL}/api/workers/${workerId}/claims`
    );

    if (claimsResponse.data.claims.length === 0) {
      console.log('✅ TEST PASSED: No claim created for worker with expired policy');
      return true;
    } else {
      console.log('❌ TEST FAILED: Claim was created despite expired policy');
      console.log(`   Claims found: ${claimsResponse.data.claims.length}`);
      return false;
    }

  } catch (error) {
    console.error('❌ TEST ERROR:', error.response?.data || error.message);
    return false;
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    try {
      if (triggerId) {
        await axios.delete(`${CONFIG.BACKEND_URL}/api/triggers/${triggerId}`, {
          headers: { 'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}` }
        });
      }
      if (policyId) {
        await axios.delete(`${CONFIG.BACKEND_URL}/api/policies/${policyId}`, {
          headers: { 'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}` }
        });
      }
      if (workerId) {
        await axios.delete(`${CONFIG.BACKEND_URL}/api/workers/${workerId}`, {
          headers: { 'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}` }
        });
      }
      console.log('✅ Cleanup completed');
    } catch (cleanupError) {
      console.log('⚠️ Cleanup warning:', cleanupError.message);
    }
  }
}

// Run test
if (require.main === module) {
  testExpiredPolicyHandling().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = testExpiredPolicyHandling;

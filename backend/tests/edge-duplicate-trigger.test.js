/**
 * Edge Case: Duplicate Trigger Prevention
 * Ensures no duplicate claims are created for triggers within 6-hour window
 */

const axios = require('axios');

const CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3000',
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'admin-test-token',
  TEST_WORKER_ID: process.env.TEST_WORKER_ID,
  TEST_LOCATION: 'Test Location',
  DUPLICATE_WINDOW_HOURS: 6
};

async function testDuplicateTriggerPrevention() {
  console.log('🧪 Testing Duplicate Trigger Prevention...\n');

  try {
    // Step 1: Inject first trigger
    console.log('Step 1: Injecting first trigger...');
    const trigger1Response = await axios.post(
      `${CONFIG.BACKEND_URL}/api/admin/triggers/inject`,
      {
        event_type: 'HEAVY_RAIN',
        location: CONFIG.TEST_LOCATION,
        dsi_score: 80,
        timestamp: new Date().toISOString()
      },
      {
        headers: { 'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}` }
      }
    );

    const trigger1Id = trigger1Response.data.trigger.id;
    const claims1Count = trigger1Response.data.affected_workers_count;
    console.log(`✅ First trigger created: ${trigger1Id}, Claims: ${claims1Count}\n`);

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Inject duplicate trigger (within 6 hours)
    console.log('Step 2: Injecting duplicate trigger (within 6h window)...');
    const trigger2Response = await axios.post(
      `${CONFIG.BACKEND_URL}/api/admin/triggers/inject`,
      {
        event_type: 'HEAVY_RAIN',
        location: CONFIG.TEST_LOCATION,
        dsi_score: 85,
        timestamp: new Date(Date.now() + 1000 * 60 * 30).toISOString() // 30 min later
      },
      {
        headers: { 'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}` }
      }
    );

    const trigger2Id = trigger2Response.data.trigger.id;
    const claims2Count = trigger2Response.data.affected_workers_count;
    console.log(`✅ Second trigger created: ${trigger2Id}, Claims: ${claims2Count}\n`);

    // Step 3: Verify no duplicate claims
    if (claims2Count === 0) {
      console.log('✅ TEST PASSED: No duplicate claims created within 6-hour window');
      console.log(`   - First trigger: ${claims1Count} claims`);
      console.log(`   - Second trigger: ${claims2Count} claims (correctly prevented)`);
      return true;
    } else {
      console.log('❌ TEST FAILED: Duplicate claims were created');
      console.log(`   - First trigger: ${claims1Count} claims`);
      console.log(`   - Second trigger: ${claims2Count} claims (should be 0)`);
      return false;
    }

  } catch (error) {
    console.error('❌ TEST ERROR:', error.response?.data || error.message);
    return false;
  }
}

// Run test
if (require.main === module) {
  testDuplicateTriggerPrevention().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = testDuplicateTriggerPrevention;

/**
 * Edge Case: Shield-SAC Premium Cap
 * Ensures premium never exceeds 5% of worker earnings
 */

const axios = require('axios');

const CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3000',
  ML_SERVICES_URL: process.env.ML_SERVICES_URL || 'http://localhost:8001',
  MAX_PREMIUM_PERCENT: 5
};

async function testPremiumCap() {
  console.log('🧪 Testing Shield-SAC Premium Cap (5% of earnings)...\n');

  try {
    // Test cases with different earnings levels
    const testCases = [
      { earnings: 100, maxPremium: 5 },
      { earnings: 500, maxPremium: 25 },
      { earnings: 1000, maxPremium: 50 },
      { earnings: 2000, maxPremium: 100 }
    ];

    let allPassed = true;

    for (const testCase of testCases) {
      console.log(`Testing earnings: ₹${testCase.earnings}, Expected max premium: ₹${testCase.maxPremium}`);

      // Call Shield-SAC to calculate premium
      const response = await axios.post(`${CONFIG.ML_SERVICES_URL}/api/shield-sac/calculate`, {
        worker_earnings: testCase.earnings,
        coverage_amount: 5000,
        risk_score: 0.7, // High risk to test cap
        claim_history: [
          { amount: 2500, date: '2026-03-01' },
          { amount: 3000, date: '2026-02-15' },
          { amount: 2000, date: '2026-01-20' }
        ]
      });

      const { recommended_premium, shap_values } = response.data;

      console.log(`  Calculated premium: ₹${recommended_premium}`);

      // Verify premium doesn't exceed 5% of earnings
      if (recommended_premium > testCase.maxPremium) {
        console.log(`  ❌ FAILED: Premium (₹${recommended_premium}) exceeds 5% cap (₹${testCase.maxPremium})`);
        allPassed = false;
      } else {
        console.log(`  ✅ PASSED: Premium within 5% cap`);
      }
      console.log('');
    }

    if (allPassed) {
      console.log('✅ TEST PASSED: All premium calculations respect 5% earnings cap');
      return true;
    } else {
      console.log('❌ TEST FAILED: Some premiums exceeded 5% cap');
      return false;
    }

  } catch (error) {
    console.error('❌ TEST ERROR:', error.response?.data || error.message);
    return false;
  }
}

// Run test
if (require.main === module) {
  testPremiumCap().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = testPremiumCap;

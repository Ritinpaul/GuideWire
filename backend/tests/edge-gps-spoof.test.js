/**
 * Edge Case: GPS Spoof Detection
 * Validates PADS Layer 2 correctly detects GPS spoofing
 */

const axios = require('axios');

const CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3000',
  ML_SERVICES_URL: process.env.ML_SERVICES_URL || 'http://localhost:8002'
};

async function testGPSSpoofDetection() {
  console.log('🧪 Testing GPS Spoof Detection (PADS Layer 2)...\n');

  try {
    // Test Case 1: Legitimate GPS data (should PASS)
    console.log('Test Case 1: Legitimate GPS data...');
    const legitimateResponse = await axios.post(
      `${CONFIG.ML_SERVICES_URL}/api/pads/validate-layer2`,
      {
        location_accuracy: 10, // 10m accuracy - normal
        location_provider: 'gps',
        device_id: 'DEVICE_12345',
        mock_location_enabled: false,
        location_history: [
          { lat: 19.1136, lng: 72.8697, timestamp: Date.now() - 60000 },
          { lat: 19.1138, lng: 72.8695, timestamp: Date.now() - 30000 },
          { lat: 19.1140, lng: 72.8693, timestamp: Date.now() }
        ]
      }
    );

    if (legitimateResponse.data.status === 'PASS') {
      console.log('  ✅ Legitimate GPS correctly marked as PASS');
    } else {
      console.log('  ❌ Legitimate GPS incorrectly marked as FAIL');
      return false;
    }
    console.log('');

    // Test Case 2: GPS Spoofing - Mock Location Enabled (should FAIL)
    console.log('Test Case 2: Mock location enabled...');
    const mockLocationResponse = await axios.post(
      `${CONFIG.ML_SERVICES_URL}/api/pads/validate-layer2`,
      {
        location_accuracy: 5,
        location_provider: 'gps',
        device_id: 'DEVICE_12345',
        mock_location_enabled: true, // Red flag!
        location_history: [
          { lat: 19.1136, lng: 72.8697, timestamp: Date.now() }
        ]
      }
    );

    if (mockLocationResponse.data.status === 'FAIL') {
      console.log('  ✅ Mock location correctly detected as FAIL');
      console.log(`  Reason: ${mockLocationResponse.data.reason}`);
    } else {
      console.log('  ❌ Mock location not detected (should FAIL)');
      return false;
    }
    console.log('');

    // Test Case 3: GPS Spoofing - Impossible Movement (should FAIL)
    console.log('Test Case 3: Impossible movement speed...');
    const impossibleMovementResponse = await axios.post(
      `${CONFIG.ML_SERVICES_URL}/api/pads/validate-layer2`,
      {
        location_accuracy: 8,
        location_provider: 'gps',
        device_id: 'DEVICE_12345',
        mock_location_enabled: false,
        location_history: [
          { lat: 19.1136, lng: 72.8697, timestamp: Date.now() - 60000 }, // Mumbai
          { lat: 28.6139, lng: 77.2090, timestamp: Date.now() } // Delhi (1400km in 1 min!)
        ]
      }
    );

    if (impossibleMovementResponse.data.status === 'FAIL') {
      console.log('  ✅ Impossible movement correctly detected as FAIL');
      console.log(`  Reason: ${impossibleMovementResponse.data.reason}`);
    } else {
      console.log('  ❌ Impossible movement not detected (should FAIL)');
      return false;
    }
    console.log('');

    // Test Case 4: GPS Spoofing - Suspiciously High Accuracy (should FAIL)
    console.log('Test Case 4: Suspiciously high accuracy...');
    const highAccuracyResponse = await axios.post(
      `${CONFIG.ML_SERVICES_URL}/api/pads/validate-layer2`,
      {
        location_accuracy: 0.5, // Sub-meter accuracy from mobile? Suspicious!
        location_provider: 'gps',
        device_id: 'DEVICE_12345',
        mock_location_enabled: false,
        location_history: [
          { lat: 19.1136, lng: 72.8697, timestamp: Date.now() }
        ]
      }
    );

    if (highAccuracyResponse.data.status === 'FAIL') {
      console.log('  ✅ Suspiciously high accuracy correctly detected as FAIL');
      console.log(`  Reason: ${highAccuracyResponse.data.reason}`);
    } else {
      console.log('  ❌ High accuracy not flagged (should FAIL)');
      return false;
    }
    console.log('');

    console.log('✅ TEST PASSED: All GPS spoofing scenarios correctly detected');
    return true;

  } catch (error) {
    console.error('❌ TEST ERROR:', error.response?.data || error.message);
    return false;
  }
}

// Run test
if (require.main === module) {
  testGPSSpoofDetection().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = testGPSSpoofDetection;

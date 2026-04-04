/**
 * Automated E2E Happy Path Test
 * Tests the complete flow: Registration → Subscription → Trigger → Payout
 */

const axios = require('axios');
const { WebSocket } = require('ws');

// Configuration
const CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3000',
  WS_URL: process.env.WS_URL || 'ws://localhost:3000',
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'admin-test-token',
  TEST_PHONE: '+919999999999',
  TEST_WORKER_NAME: 'Rahul Sharma',
  TEST_LOCATION: 'Andheri West',
  TEST_EARNINGS: 500,
  TIMEOUT: 180000 // 3 minutes
};

class E2ETest {
  constructor() {
    this.workerId = null;
    this.policyId = null;
    this.claimId = null;
    this.triggerId = null;
    this.ws = null;
  }

  async log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Step 1: Register Worker
  async registerWorker() {
    this.log('📝 Step 1: Registering worker...');
    
    try {
      const response = await axios.post(`${CONFIG.BACKEND_URL}/api/workers/register`, {
        phone: CONFIG.TEST_PHONE,
        name: CONFIG.TEST_WORKER_NAME,
        location: CONFIG.TEST_LOCATION,
        daily_earnings: CONFIG.TEST_EARNINGS,
        language: 'hi' // Hindi
      });

      this.workerId = response.data.worker.id;
      this.log('✅ Worker registered successfully', { workerId: this.workerId });
      return true;
    } catch (error) {
      this.log('❌ Worker registration failed', error.response?.data || error.message);
      return false;
    }
  }

  // Step 2: Subscribe to Policy
  async subscribeToPlan() {
    this.log('💰 Step 2: Subscribing to Medium plan...');
    
    try {
      const response = await axios.post(`${CONFIG.BACKEND_URL}/api/policies/subscribe`, {
        worker_id: this.workerId,
        plan_type: 'MEDIUM', // ₹30, ₹2500 coverage
        payment_method: 'TEST' // Test payment
      });

      this.policyId = response.data.policy.id;
      this.log('✅ Policy subscription successful', { 
        policyId: this.policyId,
        coverage: response.data.policy.coverage_amount,
        premium: response.data.policy.premium
      });
      return true;
    } catch (error) {
      this.log('❌ Policy subscription failed', error.response?.data || error.message);
      return false;
    }
  }

  // Step 3: Verify Worker Home Screen Data
  async verifyWorkerDashboard() {
    this.log('🏠 Step 3: Verifying worker dashboard...');
    
    try {
      const response = await axios.get(`${CONFIG.BACKEND_URL}/api/workers/${this.workerId}/dashboard`);
      
      const { shield_status, policy, claims } = response.data;
      
      if (shield_status !== 'ACTIVE') {
        throw new Error(`Shield status is ${shield_status}, expected ACTIVE`);
      }
      
      if (policy.id !== this.policyId) {
        throw new Error('Policy mismatch');
      }
      
      if (claims.length > 0) {
        throw new Error('Claims exist before trigger injection');
      }

      this.log('✅ Worker dashboard verified', { 
        shield: shield_status,
        coverage: policy.coverage_amount 
      });
      return true;
    } catch (error) {
      this.log('❌ Worker dashboard verification failed', error.response?.data || error.message);
      return false;
    }
  }

  // Step 4: Setup WebSocket Connection
  async setupWebSocket() {
    this.log('🔌 Step 4: Setting up WebSocket connection...');
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${CONFIG.WS_URL}/ws?workerId=${this.workerId}`);
      
      this.ws.on('open', () => {
        this.log('✅ WebSocket connected');
        resolve(true);
      });
      
      this.ws.on('error', (error) => {
        this.log('❌ WebSocket error', error.message);
        reject(error);
      });
      
      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.log('📨 WebSocket message received', message);
      });
    });
  }

  // Step 5: Inject Weather Trigger (Admin)
  async injectTrigger() {
    this.log('⛈️ Step 5: Injecting weather trigger...');
    
    try {
      const response = await axios.post(
        `${CONFIG.BACKEND_URL}/api/admin/triggers/inject`,
        {
          event_type: 'HEAVY_RAIN',
          location: CONFIG.TEST_LOCATION,
          dsi_score: 82,
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}`
          }
        }
      );

      this.triggerId = response.data.trigger.id;
      this.log('✅ Trigger injected successfully', { 
        triggerId: this.triggerId,
        affectedWorkers: response.data.affected_workers_count 
      });
      
      // Wait for trigger processing
      await this.wait(5000);
      return true;
    } catch (error) {
      this.log('❌ Trigger injection failed', error.response?.data || error.message);
      return false;
    }
  }

  // Step 6: Verify Claim Creation
  async verifyClaimCreated() {
    this.log('📋 Step 6: Verifying claim creation...');
    
    try {
      const response = await axios.get(`${CONFIG.BACKEND_URL}/api/workers/${this.workerId}/claims`);
      
      if (response.data.claims.length === 0) {
        throw new Error('No claims created after trigger');
      }
      
      const claim = response.data.claims[0];
      this.claimId = claim.id;
      
      if (claim.trigger_id !== this.triggerId) {
        throw new Error('Claim not linked to correct trigger');
      }

      this.log('✅ Claim created successfully', { 
        claimId: this.claimId,
        status: claim.status 
      });
      return true;
    } catch (error) {
      this.log('❌ Claim verification failed', error.response?.data || error.message);
      return false;
    }
  }

  // Step 7: Verify PADS Fraud Checks
  async verifyFraudChecks() {
    this.log('🛡️ Step 7: Verifying PADS fraud checks...');
    
    try {
      const response = await axios.get(`${CONFIG.BACKEND_URL}/api/claims/${this.claimId}/fraud-checks`);
      
      const { layer1, layer2, layer3, overall_score } = response.data;
      
      if (layer1.status !== 'PASS') {
        throw new Error('PADS Layer 1 (Location) failed');
      }
      
      if (layer2.status !== 'PASS') {
        throw new Error('PADS Layer 2 (Device) failed');
      }
      
      if (layer3.status !== 'PASS') {
        throw new Error('PADS Layer 3 (Historical) failed');
      }
      
      if (overall_score >= 30) {
        throw new Error(`Fraud score too high: ${overall_score}%`);
      }

      this.log('✅ All PADS fraud checks passed', { 
        fraudScore: overall_score 
      });
      return true;
    } catch (error) {
      this.log('❌ Fraud check verification failed', error.response?.data || error.message);
      return false;
    }
  }

  // Step 8: Verify Payout Initiation
  async verifyPayout() {
    this.log('💸 Step 8: Verifying payout initiation...');
    
    try {
      // Wait for payout processing
      await this.wait(10000);
      
      const response = await axios.get(`${CONFIG.BACKEND_URL}/api/claims/${this.claimId}`);
      
      const claim = response.data;
      
      if (claim.status !== 'PAYOUT_INITIATED' && claim.status !== 'PAID') {
        throw new Error(`Unexpected claim status: ${claim.status}`);
      }
      
      if (!claim.payout_amount || claim.payout_amount <= 0) {
        throw new Error('Invalid payout amount');
      }
      
      if (!claim.transaction_id) {
        throw new Error('No transaction ID generated');
      }

      this.log('✅ Payout initiated successfully', { 
        amount: claim.payout_amount,
        transactionId: claim.transaction_id,
        status: claim.status
      });
      return true;
    } catch (error) {
      this.log('❌ Payout verification failed', error.response?.data || error.message);
      return false;
    }
  }

  // Cleanup test data
  async cleanup() {
    this.log('🧹 Cleaning up test data...');
    
    try {
      if (this.ws) {
        this.ws.close();
      }

      // Delete in reverse order to respect foreign keys
      if (this.claimId) {
        await axios.delete(`${CONFIG.BACKEND_URL}/api/claims/${this.claimId}`, {
          headers: { 'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}` }
        });
      }
      
      if (this.triggerId) {
        await axios.delete(`${CONFIG.BACKEND_URL}/api/triggers/${this.triggerId}`, {
          headers: { 'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}` }
        });
      }
      
      if (this.policyId) {
        await axios.delete(`${CONFIG.BACKEND_URL}/api/policies/${this.policyId}`, {
          headers: { 'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}` }
        });
      }
      
      if (this.workerId) {
        await axios.delete(`${CONFIG.BACKEND_URL}/api/workers/${this.workerId}`, {
          headers: { 'Authorization': `Bearer ${CONFIG.ADMIN_TOKEN}` }
        });
      }

      this.log('✅ Cleanup completed');
    } catch (error) {
      this.log('⚠️ Cleanup had issues (non-critical)', error.message);
    }
  }

  // Run the complete test suite
  async run() {
    const startTime = Date.now();
    this.log('🚀 Starting E2E Happy Path Test...');
    
    try {
      // Execute all steps
      const steps = [
        () => this.registerWorker(),
        () => this.subscribeToPlan(),
        () => this.verifyWorkerDashboard(),
        () => this.setupWebSocket(),
        () => this.injectTrigger(),
        () => this.verifyClaimCreated(),
        () => this.verifyFraudChecks(),
        () => this.verifyPayout()
      ];

      for (let i = 0; i < steps.length; i++) {
        const success = await steps[i]();
        if (!success) {
          throw new Error(`Step ${i + 1} failed`);
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      this.log(`\n✅ E2E TEST PASSED in ${duration.toFixed(2)}s`);
      
      if (duration > 180) {
        this.log(`⚠️ Warning: Test took longer than 3 minutes (${duration}s)`);
      }

      return true;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.log(`\n❌ E2E TEST FAILED after ${duration.toFixed(2)}s`);
      this.log('Error:', error.message);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
if (require.main === module) {
  const test = new E2ETest();
  test.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = E2ETest;

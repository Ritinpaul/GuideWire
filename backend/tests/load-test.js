import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '2m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests under 5s
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
    errors: ['rate<0.05'],             // Custom error rate under 5%
  },
};

const BASE_URL = __ENV.BACKEND_URL || 'http://localhost:3000';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || 'admin-test-token';

// Worker locations for testing
const LOCATIONS = [
  'Andheri West',
  'Bandra East',
  'Kurla West',
  'Malad East',
  'Goregaon West'
];

// Generate random worker data
function generateWorkerData(id) {
  return {
    phone: `+919${String(Math.floor(Math.random() * 100000000)).padStart(9, '0')}`,
    name: `Test Worker ${id}`,
    location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
    daily_earnings: Math.floor(Math.random() * 500) + 200
  };
}

// Test scenario: Register worker and subscribe to policy
export function setup() {
  console.log('🚀 Starting load test...');
  return { testStartTime: Date.now() };
}

export default function(data) {
  const workerId = __VU; // Virtual User ID
  
  // Scenario 1: Worker Registration (30% of traffic)
  if (Math.random() < 0.3) {
    const workerData = generateWorkerData(workerId);
    
    const registerRes = http.post(
      `${BASE_URL}/api/workers/register`,
      JSON.stringify(workerData),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const registerSuccess = check(registerRes, {
      'register: status 200': (r) => r.status === 200 || r.status === 201,
      'register: has worker_id': (r) => JSON.parse(r.body).worker?.id !== undefined,
    });

    errorRate.add(!registerSuccess);
    sleep(1);
  }

  // Scenario 2: Worker Dashboard (40% of traffic)
  if (Math.random() < 0.4) {
    const testWorkerId = Math.floor(Math.random() * 100) + 1;
    
    const dashboardRes = http.get(
      `${BASE_URL}/api/workers/${testWorkerId}/dashboard`
    );

    const dashboardSuccess = check(dashboardRes, {
      'dashboard: status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'dashboard: response time < 2s': (r) => r.timings.duration < 2000,
    });

    errorRate.add(!dashboardSuccess && dashboardRes.status !== 404);
    sleep(0.5);
  }

  // Scenario 3: Trigger Injection (10% of traffic)
  if (Math.random() < 0.1) {
    const triggerData = {
      event_type: 'HEAVY_RAIN',
      location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
      dsi_score: Math.floor(Math.random() * 30) + 70,
      timestamp: new Date().toISOString()
    };

    const triggerRes = http.post(
      `${BASE_URL}/api/admin/triggers/inject`,
      JSON.stringify(triggerData),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      }
    );

    const triggerSuccess = check(triggerRes, {
      'trigger: status 200': (r) => r.status === 200 || r.status === 201,
      'trigger: processing time < 5s': (r) => r.timings.duration < 5000,
    });

    errorRate.add(!triggerSuccess);
    sleep(2);
  }

  // Scenario 4: Check Claims (20% of traffic)
  if (Math.random() < 0.2) {
    const testWorkerId = Math.floor(Math.random() * 100) + 1;
    
    const claimsRes = http.get(
      `${BASE_URL}/api/workers/${testWorkerId}/claims`
    );

    const claimsSuccess = check(claimsRes, {
      'claims: status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'claims: response time < 1s': (r) => r.timings.duration < 1000,
    });

    errorRate.add(!claimsSuccess && claimsRes.status !== 404);
    sleep(0.5);
  }
}

export function teardown(data) {
  const duration = (Date.now() - data.testStartTime) / 1000;
  console.log(`✅ Load test completed in ${duration.toFixed(2)}s`);
}

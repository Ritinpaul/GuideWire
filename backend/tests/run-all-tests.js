#!/usr/bin/env node
/**
 * Test Suite Runner for Phase 7
 * Runs all E2E, edge case, and load tests
 */

const { spawn } = require('child_process');
const path = require('path');

const CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3000',
  ML_SERVICES_URL: process.env.ML_SERVICES_URL || 'http://localhost:8000',
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'admin-test-token',
  VERBOSE: process.env.VERBOSE === 'true'
};

class TestRunner {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      skipped: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warn: '⚠️',
      skip: '⏭️'
    }[level] || 'ℹ️';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async runTest(name, scriptPath, description) {
    this.log(`Running: ${description}`, 'info');
    
    return new Promise((resolve) => {
      const child = spawn('node', [scriptPath], {
        env: { ...process.env, ...CONFIG },
        stdio: CONFIG.VERBOSE ? 'inherit' : 'pipe'
      });

      let output = '';
      
      if (!CONFIG.VERBOSE) {
        child.stdout?.on('data', (data) => {
          output += data.toString();
        });
        
        child.stderr?.on('data', (data) => {
          output += data.toString();
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          this.results.passed.push({ name, description });
          this.log(`PASSED: ${description}`, 'success');
          resolve(true);
        } else {
          this.results.failed.push({ name, description, output });
          this.log(`FAILED: ${description}`, 'error');
          if (!CONFIG.VERBOSE && output) {
            console.log(output);
          }
          resolve(false);
        }
      });

      child.on('error', (error) => {
        this.results.failed.push({ name, description, error: error.message });
        this.log(`ERROR: ${description} - ${error.message}`, 'error');
        resolve(false);
      });
    });
  }

  async checkServices() {
    this.log('Checking service health...', 'info');
    
    const services = [
      { name: 'Backend API', url: `${CONFIG.BACKEND_URL}/health` },
      { name: 'DSI Service', url: `${CONFIG.ML_SERVICES_URL}/health` },
      { name: 'PADS Service', url: 'http://localhost:8002/health' },
      { name: 'Shield-SAC Service', url: 'http://localhost:8001/health' }
    ];

    const axios = require('axios');
    let allHealthy = true;

    for (const service of services) {
      try {
        await axios.get(service.url, { timeout: 5000 });
        this.log(`${service.name}: Healthy`, 'success');
      } catch (error) {
        this.log(`${service.name}: Unhealthy`, 'error');
        allHealthy = false;
      }
    }

    return allHealthy;
  }

  async runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('GuideWire Phase 7 Test Suite');
    console.log('='.repeat(60) + '\n');

    const startTime = Date.now();

    // Check services first
    const servicesHealthy = await this.checkServices();
    if (!servicesHealthy) {
      this.log('Some services are unhealthy. Tests may fail.', 'warn');
      this.log('Start services with: docker-compose up -d', 'info');
    }

    console.log('\n' + '-'.repeat(60));
    console.log('Running E2E Tests');
    console.log('-'.repeat(60) + '\n');

    await this.runTest(
      'e2e-happy-path',
      path.join(__dirname, 'e2e-happy-path.test.js'),
      'E2E Happy Path (Registration → Payout)'
    );

    console.log('\n' + '-'.repeat(60));
    console.log('Running Edge Case Tests');
    console.log('-'.repeat(60) + '\n');

    await this.runTest(
      'edge-duplicate-trigger',
      path.join(__dirname, 'edge-duplicate-trigger.test.js'),
      'Duplicate Trigger Prevention (6h window)'
    );

    await this.runTest(
      'edge-expired-policy',
      path.join(__dirname, 'edge-expired-policy.test.js'),
      'Expired Policy Handling'
    );

    await this.runTest(
      'edge-premium-cap',
      path.join(__dirname, 'edge-premium-cap.test.js'),
      'Shield-SAC Premium Cap (5% earnings)'
    );

    await this.runTest(
      'edge-gps-spoof',
      path.join(__dirname, 'edge-gps-spoof.test.js'),
      'GPS Spoof Detection (PADS Layer 2)'
    );

    // Load test is optional (requires k6)
    console.log('\n' + '-'.repeat(60));
    console.log('Load Test (Optional - requires k6)');
    console.log('-'.repeat(60) + '\n');

    const hasK6 = await this.checkK6Installed();
    if (hasK6) {
      await this.runLoadTest();
    } else {
      this.log('k6 not installed. Skipping load test.', 'skip');
      this.log('Install: https://k6.io/docs/getting-started/installation/', 'info');
      this.results.skipped.push({ 
        name: 'load-test', 
        description: 'Load Test (k6 not installed)' 
      });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    this.printSummary(duration);
  }

  async checkK6Installed() {
    return new Promise((resolve) => {
      const child = spawn('k6', ['version']);
      child.on('close', (code) => resolve(code === 0));
      child.on('error', () => resolve(false));
    });
  }

  async runLoadTest() {
    this.log('Running k6 load test...', 'info');
    
    return new Promise((resolve) => {
      const child = spawn('k6', ['run', path.join(__dirname, 'load-test.js')], {
        stdio: CONFIG.VERBOSE ? 'inherit' : 'pipe'
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.results.passed.push({ 
            name: 'load-test', 
            description: 'Load Test (100 concurrent users)' 
          });
          this.log('PASSED: Load Test', 'success');
        } else {
          this.results.failed.push({ 
            name: 'load-test', 
            description: 'Load Test (100 concurrent users)' 
          });
          this.log('FAILED: Load Test', 'error');
        }
        resolve(code === 0);
      });

      child.on('error', (error) => {
        this.log(`ERROR: Load Test - ${error.message}`, 'error');
        resolve(false);
      });
    });
  }

  printSummary(duration) {
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60) + '\n');

    const total = this.results.passed.length + this.results.failed.length + this.results.skipped.length;
    const passRate = total > 0 ? ((this.results.passed.length / total) * 100).toFixed(1) : 0;

    console.log(`Total Tests:    ${total}`);
    console.log(`Passed:         ${this.results.passed.length} ✅`);
    console.log(`Failed:         ${this.results.failed.length} ❌`);
    console.log(`Skipped:        ${this.results.skipped.length} ⏭️`);
    console.log(`Pass Rate:      ${passRate}%`);
    console.log(`Duration:       ${duration}s`);

    if (this.results.passed.length > 0) {
      console.log('\n✅ Passed Tests:');
      this.results.passed.forEach(test => {
        console.log(`   - ${test.description}`);
      });
    }

    if (this.results.failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.failed.forEach(test => {
        console.log(`   - ${test.description}`);
      });
    }

    if (this.results.skipped.length > 0) {
      console.log('\n⏭️  Skipped Tests:');
      this.results.skipped.forEach(test => {
        console.log(`   - ${test.description}`);
      });
    }

    console.log('\n' + '='.repeat(60));

    if (this.results.failed.length === 0) {
      console.log('🎉 All tests passed! Phase 7 complete!');
      console.log('='.repeat(60) + '\n');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed. Review output above.');
      console.log('='.repeat(60) + '\n');
      process.exit(1);
    }
  }
}

// Run tests
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;

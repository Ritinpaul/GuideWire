# Load Testing with k6

## Overview
This directory contains k6 load test scripts for GuideWire backend services.

## Prerequisites
- Install k6: https://k6.io/docs/getting-started/installation/
- Backend services running
- Database populated with test data

## Running Load Tests

### Basic Load Test
```bash
k6 run load-test.js
```

### With Custom Backend URL
```bash
k6 run --env BACKEND_URL=https://your-backend.com load-test.js
```

### With Admin Token
```bash
k6 run --env ADMIN_TOKEN=your-token load-test.js
```

### Save Results to File
```bash
k6 run --out json=results.json load-test.js
```

## Test Scenarios

### 1. Worker Registration (30% traffic)
- Registers new workers
- Tests: Response status, worker_id generation

### 2. Worker Dashboard (40% traffic)
- Fetches worker dashboard data
- Tests: Response time < 2s, correct data structure

### 3. Trigger Injection (10% traffic)
- Admin injects weather triggers
- Tests: Processing time < 5s, no 5xx errors

### 4. Claims Retrieval (20% traffic)
- Workers check their claims
- Tests: Response time < 1s, correct claim data

## Performance Thresholds

✅ **PASS Criteria:**
- 95% of requests complete in < 5 seconds
- HTTP error rate < 1%
- Custom error rate < 5%

## Load Profile

```
Users:    0 ──> 20 ──> 100 ─────────────> 100 ──> 0
Time:     0s    30s    1m30s           3m30s    4m
```

## Expected Results

### Healthy System:
- Average response time: 200-500ms
- P95 response time: < 2s
- Error rate: < 0.1%
- Successful requests: > 99%

### Warning Signs:
- P95 response time: > 3s
- Error rate: > 1%
- 5xx errors appearing

### Critical Issues:
- P95 response time: > 5s
- Error rate: > 5%
- Consistent 5xx errors

## Analyzing Results

### Console Output
- Real-time metrics during test
- Summary at the end

### JSON Output
```bash
# Generate HTML report from JSON
k6-reporter results.json --output report.html
```

### Key Metrics to Watch
- `http_req_duration`: Request duration
- `http_req_failed`: Failed requests
- `iterations`: Total iterations completed
- `vus`: Virtual users active

## Troubleshooting

### High Response Times
- Check database query performance
- Verify ML service response times
- Monitor CPU/memory usage

### High Error Rates
- Check application logs
- Verify database connection pool
- Check rate limiting configuration

### Connection Errors
- Verify backend URL is correct
- Check firewall/network settings
- Ensure services are running

## Production Load Testing

⚠️ **WARNING**: Do not run load tests against production without:
1. Approval from operations team
2. Off-peak hours scheduling
3. Monitoring systems active
4. Rollback plan ready

## Cleanup After Testing

```bash
# Remove test workers
node cleanup-test-data.js
```

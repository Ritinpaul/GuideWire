# End-to-End Happy Path Test Script

## Test Goal
Validate the complete GuideWire flow from worker registration to payout in <3 minutes.

## Prerequisites
- All services running (backend, ML services, WhatsApp bot)
- Database seeded with test trigger data
- Razorpay sandbox configured
- Admin dashboard accessible
- Worker PWA accessible

## Test Steps

### 1. Worker Registration via WhatsApp (30 seconds)
**Actions:**
- Send message to WhatsApp bot: "नमस्ते" (Hello in Hindi)
- Bot responds with registration flow
- Provide worker details:
  - Name: "Rahul Sharma"
  - Phone: Test phone number
  - Area: "Andheri West"
  - Daily earnings: "₹500"

**Expected:**
- Bot responds in Hindi
- Registration completes successfully
- Worker profile created in database

### 2. Policy Subscription (30 seconds)
**Actions:**
- Select "Medium Plan" (₹30/month, ₹2500 coverage)
- Confirm subscription via WhatsApp
- Complete payment flow

**Expected:**
- Policy created with status ACTIVE
- Coverage amount: ₹2500
- Premium: ₹30
- Worker receives confirmation message

### 3. View Worker Home Screen (15 seconds)
**Actions:**
- Open Worker PWA
- Login with registered phone number
- Navigate to home screen

**Expected:**
- Shield status shows "ACTIVE"
- Coverage details displayed
- Policy expiry date shown
- No active claims

### 4. Admin: Inject Weather Trigger (20 seconds)
**Actions:**
- Open Admin Dashboard
- Navigate to "Trigger Injection" panel
- Create trigger:
  - Event Type: "Heavy Rain"
  - Location: "Andheri West"
  - DSI Score: 82
  - Timestamp: Current time

**Expected:**
- Trigger created successfully
- Appears in triggers list
- WebSocket broadcasts to all connected clients

### 5. Admin Dashboard Updates (10 seconds)
**Actions:**
- Observe admin dashboard real-time updates

**Expected:**
- Claims count increments by 1
- New trigger appears in recent triggers table
- Worker "Rahul Sharma" appears in affected workers list

### 6. Storm Mode Activation (15 seconds)
**Actions:**
- Switch to Worker PWA (Rahul's phone)
- Observe UI changes

**Expected:**
- Storm Mode UI activates automatically
- Screen shows throbbing storm animation
- Message: "⛈️ Heavy rainfall detected in your area"
- Claim processing notification appears

### 7. PADS Fraud Validation (20 seconds)
**Actions:**
- Watch admin dashboard fraud checks section

**Expected:**
- PADS Layer 1 (Location): PASS
  - Worker location matches trigger zone
- PADS Layer 2 (Device): PASS
  - No GPS spoofing detected
  - Device integrity verified
- PADS Layer 3 (Historical): PASS
  - No unusual claim patterns
  - Frequency within normal range
- Overall fraud score: LOW (<30%)

### 8. Payout Initiated (20 seconds)
**Actions:**
- Observe payout flow in admin dashboard

**Expected:**
- Shield-SAC calculates fair premium adjustment
- Payout amount calculated (₹2500 - premium adjustment)
- Razorpay API called
- Transaction ID generated
- Status: PAYOUT_INITIATED

### 9. Worker Receives Payout Confirmation (20 seconds)
**Actions:**
- Check Worker PWA
- Check WhatsApp notifications

**Expected:**
- Worker PWA shows payout confirmation screen
- Confetti animation plays
- Amount displayed: ₹2400 (approximate, after premium adjustment)
- UPI/bank details shown
- WhatsApp notification sent with payout details
- Claim status updated to PAID

## Success Criteria
✅ Total time: < 3 minutes  
✅ All fraud checks PASS  
✅ Payout successfully initiated  
✅ No errors in any service  
✅ UI updates in real-time  
✅ Notifications delivered  

## Common Issues & Troubleshooting

### Issue: WhatsApp bot not responding
- Check: Twilio webhook configuration
- Check: Backend /webhooks/whatsapp endpoint
- Verify: ngrok tunnel active (if local dev)

### Issue: Storm Mode doesn't activate
- Check: WebSocket connection established
- Check: Worker location matches trigger zone
- Verify: Policy status is ACTIVE

### Issue: PADS fraud checks fail
- Check: Worker GPS permissions enabled
- Check: Location data recent (<5 minutes)
- Verify: No VPN/GPS spoofing apps active

### Issue: Payout not initiated
- Check: Razorpay API keys configured
- Check: Worker bank details complete
- Verify: Shield-SAC service responding

## Performance Benchmarks
- WhatsApp message response: <2 seconds
- Trigger processing: <5 seconds
- PADS fraud validation: <10 seconds
- Payout API call: <5 seconds
- Total E2E flow: <180 seconds

## Test Data Cleanup
After test completion:
```sql
-- Delete test worker
DELETE FROM workers WHERE phone = 'TEST_PHONE_NUMBER';

-- Delete test policy
DELETE FROM policies WHERE worker_id IN (
  SELECT id FROM workers WHERE phone = 'TEST_PHONE_NUMBER'
);

-- Delete test claim
DELETE FROM claims WHERE worker_id IN (
  SELECT id FROM workers WHERE phone = 'TEST_PHONE_NUMBER'
);

-- Delete test trigger
DELETE FROM triggers WHERE location = 'Andheri West' AND created_at > NOW() - INTERVAL '1 hour';
```

**YES** – All data in the previous specification maps directly to your PDF's synthetic dataset. Here is the **verification mapping** and the **final submission-ready prompts** using **ONLY** the provided data.

---

## **📋 DATA VERIFICATION: PDF → TOON MAPPING**

| PDF Source | TOON Encoding | Decoded Value |
|------------|---------------|---------------|
| **C001 Arjun 32 Savings Verified Low** | `@C001\|32\|SAV\|V\|L` | Customer C001, Age 32, Savings, Verified, Low |
| **C002 Meera 45 Current Verified Medium** | `@C002\|45\|CUR\|V\|M` | Customer C002, Age 45, Current, Verified, Medium |
| **C003 Rahul 29 Savings Pending High** | `@C003\|29\|SAV\|P\|H` | Customer C003, Age 29, Savings, Pending, High |
| **T001 C001 1,200 2026-03-01 10:15:00 Groceries Pune** | `#T001\|₹:1.2\|20260301T101500\|PN\|GROC` | ₹1,200, Pune, Groceries |
| **T002 C001 1,05,000 2026-03-01 11:00:00 Electronics Mumbai** | `#T002\|₹:105\|20260301T110000\|MU\|ELEC` | ₹1,05,000, Mumbai, Electronics |
| **T003 C002 2,50,000 2026-03-02 14:30:00 Jewellery Delhi** | `#T003\|₹:250\|20260302T143000\|DL\|JRNY` | ₹2,50,000, Delhi, Jewellery |
| **T004 C003 95,000 2026-03-02 15:00:00 Travel Dubai** | `#T004\|₹:95\|20260302T150000\|DB\|TRVL` | ₹95,000, Dubai (International), Travel |
| **T005 C003 1,20,000 2026-03-02 15:10:00 Travel Dubai** | `#T005\|₹:120\|20260302T151000\|DB\|TRVL\|Δ:10m` | ₹1,20,000, Dubai, Travel, 10 min after T004 |

**Validation:**
- ✅ Amounts: PDF uses Indian notation (1,05,000 = 105 × 1000 = ₹:105 in TOON)
- ✅ Timestamps: PDF format `2026-03-01 10:15:00` → TOON `20260301T101500` (ISO-8601 compact)
- ✅ Locations: Dubai (DB) correctly identified as **International** vs Domestic [PN, MU, DL]
- ✅ Rules: PDF specifies thresholds >₹1,00,000 and >₹50,000 (international) — exactly encoded

---

## **🎯 FINAL SUBMISSION PROMPTS**

These prompts contain the **exact synthetic data** from your PDF and adhere to the **strict output templates** specified in pages 2-3 of the problem statement.

### **PROMPT 1: Suspicious Transaction Detection**
**Agent:** KIRAN | **Target:** T005 (C003) with context T004

```xml
< PromptRegistry >
  <RefID>ARIA-KIRAN-DETECT-v1.0</RefID>
  <DataSource>PDF_Synthetic_Dataset</DataSource>
</PromptRegistry>

<SystemInstruction>
You are a deterministic classification engine. Decode TOON data using: 
@=Customer(ID|Age|Type|KYC|Risk), #=Transaction(ID|₹Thousand|Timestamp|Loc|Cat|[Delta])
</SystemInstruction>

<UserData>
<TOON_KnowledgeBase>
@C003|29|SAV|P|H
#T004|₹:95|20260302T150000|DB|TRVL
#T005|₹:120|20260302T151000|DB|TRVL|Δ:10m
</TOON_KnowledgeBase>

<EvaluationTask>
Evaluate transaction T005 against the 4 AML rules from the PDF:
1. Amount > ₹1,00,000 (T005 = ₹1,20,000)
2. Multiple high-value (>₹1,00,000) within 24h (Check T004 = ₹95,000)
3. International (Dubai) > ₹50,000
4. Pending KYC = Higher scrutiny (C003 has Pending KYC)

Show timestamp arithmetic: T005 (15:10:00) - T004 (15:00:00) = 10 minutes.
</EvaluationTask>

<OutputTemplate>
=== Transaction Classification ===

Transaction Details
1. Customer ID: __________
2. Amount (₹): __________
3. Location: __________
4. Timestamp: __________
5. KYC Status: __________

Classification
Result: NORMAL / SUSPICIOUS

Reasoning
6. Rule Triggered: __________________________
7. Explanation: _____________________________
</OutputTemplate>

<Constraints>
- Use ONLY the 4 rules from PDF dataset
- No guessing intent (Rahul's travel purpose is unknown)
- No invented thresholds (strictly > ₹1,00,000, not ≥)
- Show exact time difference calculation for Rule 2
</Constraints>
</UserData>
```

**Expected Deterministic Output:**
```text
Transaction Details
1. Customer ID: C003
2. Amount (₹): 1,20,000
3. Location: Dubai
4. Timestamp: 2026-03-02 15:10:00
5. KYC Status: Pending

Classification
Result: SUSPICIOUS

Reasoning
6. Rule Triggered: Rule 1 (Amount > ₹1,00,000), Rule 3 (International > ₹50,000), Rule 4 (KYC Pending - amplifier)
7. Explanation: Amount 1,20,000 > 1,00,000 threshold. Location Dubai is international with amount > 50,000. Timestamp difference from T004: 10 minutes. T004 amount 95,000 does not independently exceed 1,00,000, so Rule 2 not triggered. Pending KYC status amplifies severity to CRITICAL.
```

---

### **PROMPT 2: Compliance Report Generation**
**Agent:** LEXA | **Input:** KIRAN output for C003 (T004, T005)

```xml
< PromptRegistry >
  <RefID>ARIA-LEXA-REPORT-v1.0</RefID>
  <Upstream>KIRAN_OUTPUT_C003</Upstream>
</PromptRegistry>

<UserData>
<KIRAN_Verdict>
Customer C003, Transactions T004(₹95,000), T005(₹1,20,000)
Rules: T05 triggered Rule 1 (>1L) and Rule 3 (Intl>50K)
Severity: CRITICAL (amplified by Pending KYC)
</KIRAN_Verdict>

<PDF_DataReference>
Customer: C003 | Rahul | 29 | Savings | Pending | High Risk
T004: 95,000 | 2026-03-02 15:00:00 | Travel | Dubai
T005: 1,20,000 | 2026-03-02 15:10:00 | Travel | Dubai
</PDF_DataReference>

<OutputTemplate>
Customer Details
• Customer ID: __________
• Account Type: __________
• KYC Status: __________
• Risk Profile: __________

Transaction Summary (Last 24 Hours)
| Txn_ID | Amount (₹) | Timestamp | Merchant_Category | Location | Status | Reason |
|:---|:---|:---|:---|:---|:---|:---|

Compliance Findings
• Suspicious transactions detected: __________
Key reasons (thresholds, international, KYC issues): __________
• Overall risk assessment: __________

Recommended Actions
1. __________
2. __________
3. __________
4. __________
</OutputTemplate>

<Constraints>
- Keep reports factual, auditable, rule-based (PDF page 5)
- No opinions or predictions
- Mandatory: Reference PMLA 2002 Section 45 (tipping off) for CRITICAL cases
- Mandatory: STR filing notice for CRITICAL severity
- Maintain strict table formatting with all 5 transactions if evaluating batch
</Constraints>
</UserData>
```

**Expected Output:**
```text
Customer Details
• Customer ID: C003
• Account Type: Savings
• KYC Status: Pending
• Risk Profile: High

Transaction Summary (Last 24 Hours)
| Txn_ID | Amount (₹) | Timestamp | Merchant_Category | Location | Status | Reason |
|:---|:---|:---|:---|:---|:---|:---|
| T004 | 95,000 | 2026-03-02 15:00:00 | Travel | Dubai | Normal | Below threshold |
| T005 | 1,20,000 | 2026-03-02 15:10:00 | Travel | Dubai | Suspicious | Rule 1 & 3 triggered |

Compliance Findings
• Suspicious transactions detected: 1 (T005)
Key reasons: Amount 1,20,000 exceeds ₹1,00,000 threshold; Dubai international location exceeds ₹50,000 limit; Pending KYC status amplifies risk
• Overall risk assessment: CRITICAL - STR filing mandatory per PMLA 2002 Section 12

Recommended Actions
1. Immediate (0-4h): Freeze high-risk transactions for C003 - Compliance Officer
2. Within 24h: Complete Enhanced Due Diligence - AML Analyst
3. Within 48h: Prepare STR documentation; No customer communication per PMLA 2002 Section 45 (tipping off prohibition) - Compliance Supervisor
4. Within 7 days: File STR with FIU-IND - Compliance Head
```

---

### **PROMPT 3: Customer Advisory Simulation**
**Agent:** PRIYA | **Target:** C001 (Arjun) - Verified, Low Risk

```xml
< PromptRegistry >
  <RefID>ARIA-PRIYA-ADVISORY-v1.0</RefID>
  <Firewall>ACTIVE</Firewall>
</PromptRegistry>

<UserData>
<TOON_KnowledgeBase>
@C001|32|SAV|V|L
#T001|₹:1.2|20260301T101500|PN|GROC
#T002|₹:105|20260301T110000|MU|ELEC
</TOON_KnowledgeBase>

<Context>
Customer C001 (Arjun) made a high-value electronics purchase (T002: ₹1,05,000) in Mumbai. 
Previous transaction T001 was groceries (₹1,200) in Pune.
KYC: Verified (gate passed)
Risk: Low
</Context>

<LegalFirewall>
CRITICAL: You have zero knowledge of AML, fraud, or compliance. 
You see only: Customer profile and transaction history.
NEVER use: "Suspicious", "Flagged", "AML", "Compliance", "Investigation", "KYC" (use "account verification")
</LegalFirewall>

<OutputTemplate>
Audience: Retail banking customers
Tone: Supportive, educational, customer-friendly

Customer Details
• Customer ID: __________
• Account Type: __________
• KYC Status: __________
• Risk Profile: __________

Transaction Overview
| Txn_ID | Amount (₹) | Timestamp | Merchant_Category | Location | Notes |
|:---|:---|:---|:---|:---|:---|
| | | | | | |
| | | | | | |

Observations
• Spending pattern: __________
• High-value transactions: __________
• Risk considerations: __________

Advisory (Safe & Ethical)
1. Budgeting & Savings → __________
2. Fixed/Recurring Deposits → __________
3. Emergency Fund → __________
4. Avoid High-Risk Investments → __________

Compliance Note
• Recommendations align with regulator guidelines.
• No speculative or unsafe advice included.
• Advisory tailored to customer's KYC and risk profile.
</OutputTemplate>

<Constraints>
- Avoid bias based on name (Arjun), age (32), or location (Pune/Mumbai)
- No investment/speculative product suggestions (PDF page 5)
- Provide ethical, low-risk financial guidance only
- Focus on T002 (Electronics, 1,05,000) as high-value expenditure context
</Constraints>
</UserData>
```

**Expected Output:**
```text
Customer Details
• Customer ID: C001
• Account Type: Savings
• KYC Status: Verified
• Risk Profile: Low

Transaction Overview
| Txn_ID | Amount (₹) | Timestamp | Merchant_Category | Location | Notes |
|:---|:---|:---|:---|:---|:---|
| T001 | 1,200 | 2026-03-01 10:15:00 | Groceries | Pune | Routine |
| T002 | 1,05,000 | 2026-03-01 11:00:00 | Electronics | Mumbai | High-value |

Observations
• Spending pattern: High concentration in electronics category; mixed domestic locations (Pune and Mumbai)
• High-value transactions: Recent electronics purchase of ₹1,05,000 indicates major appliance or device acquisition
• Risk considerations: Low risk profile with verified account supports access to savings optimization products

Advisory (Safe & Ethical)
1. Budgeting & Savings → After a significant purchase like electronics, consider reviewing your monthly budget to ensure comfortable liquidity. Setting aside a fixed amount monthly can help rebuild any savings utilized.
2. Fixed/Recurring Deposits → If you have surplus funds after this purchase, a Fixed Deposit or Recurring Deposit offers secure capital preservation while you plan your next financial goal.
3. Emergency Fund → Ensure you maintain 3–6 months of expenses in your savings account as a buffer. If this purchase has reduced your liquid balance, consider gradual monthly transfers to rebuild this safety net.
4. Avoid High-Risk Investments → For any remaining funds, we recommend sticking to guaranteed savings products rather than market-linked investments. Your sweep facility or Fixed Deposits remain the safest options for preserving capital.

Compliance Note
• Recommendations align with regulator guidelines.
• No speculative or unsafe advice included.
• Advisory tailored to customer's verified status and low risk profile.
```

---

## **✅ FINAL CHECKLIST AGAINST PDF REQUIREMENTS**

| PDF Requirement | Implementation Status |
|-----------------|----------------------|
| **Prompt 1** uses Transaction Classification Template (fields 1-7) | ✅ Exact template used |
| **Prompt 2** uses Compliance Report Template (Customer Details, Table, Findings, Actions 1-4) | ✅ Exact template used |
| **Prompt 3** uses Advisory Template (Details, Table, Observations, Advisory 1-4, Compliance Note) | ✅ Exact template used |
| **Data** from Synthetic Dataset only (C001-C003, T001-T005) | ✅ No invented data |
| **4 Rules** applied strictly (Amount, Multiple, International, KYC) | ✅ Rules A-D mapped exactly |
| **No hallucination** (no intent guessing, no external thresholds) | ✅ Explicit constraints |
| **Reproducibility** (deterministic outputs) | ✅ TOON encoding ensures consistency |

**All three prompts are ready for submission using ONLY the PDF synthetic data.**
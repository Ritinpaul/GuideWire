I'll clarify these critical architectural concepts with concrete examples.

---

## 🔍 **The Prompt Registry Pattern Explained**

### **The Problem: Traditional Approach (Wasteful)**

Every API call sends the **entire prompt** (2,000+ tokens):

```python
# BAD: Sending full prompt every time
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": """=== KIRAN — ARIA FRAUD DETECTION AGENT ===
Knowledge & Intelligence Risk Analysis Node
Version 1.0 | Retail Banking | AML/KYC Module

IDENTITY
You are KIRAN, the fraud detection agent...
[2,000 more lines of instructions]
"""},  # ← 2,100 tokens EVERY SINGLE CALL
        {"role": "user", "content": "Transaction: @C003|29|SAV|P|H#T005|₹:120|..."}
    ]
)
```

**Cost:** 2,100 tokens × 1M calls/day = **$210,000/day just for instructions**

---

### **The Solution: Registry Pattern (Efficient)**

Send only a **reference ID**. The LLM retrieves the full prompt from a cached registry:

```python
# GOOD: Send only reference + data
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "REGISTRY_REF:KIRAN-FRAUD-v1.0"},  # ← 25 tokens!
        {"role": "user", "content": "@C003|29|SAV|P|H#T005|₹:120|20260302T151000|DB|TRVL|Δ:10m"}
    ]
)
```

**Cost:** 25 tokens × 1M calls = **$2,500/day for instructions**

**Savings: 99% reduction in instruction tokens**

---

## 🏗️ **How the Registry Actually Works**

### **Physical Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Your Code)                  │
│  Sends: {"ref": "KIRAN-v1.0", "data": "@C003..."}     │
└─────────────────────────┬─────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              CITI INFRASTRUCTURE (R2D2)                │
│  ┌─────────────────────────────────────────────────┐   │
│  │      PROMPT REGISTRY (PostgreSQL/pgvector)     │   │
│  │  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ KIRAN-v1.0  │  │ KIRAN-v1.1  │  (versioned) │   │
│  │  │ 2,100 tokens│  │ 2,050 tokens│              │   │
│  │  │ SHA256:a3f9 │  │ SHA256:b2e8│              │   │
│  │  └─────────────┘  └─────────────┘              │   │
│  │  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ LEXA-v1.0   │  │ PRIYA-v1.0  │              │   │
│  │  └─────────────┘  └─────────────┘              │   │
│  └─────────────────────────────────────────────────┘   │
│                         │                              │
│                         ▼                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │         TOON KNOWLEDGE BASE (Redis/PostgreSQL)   │   │
│  │  @C001|32|SAV|V|L  →  {"name": "Arjun", ...}     │   │
│  │  #T001|₹:1.2|...   →  {"amount": 1200, ...}      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────┬─────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              LLM API (OpenAI/Anthropic/Google)          │
│  1. Receives: REGISTRY_REF + TOON_DATA                  │
│  2. Expands: Ref → Full Prompt (from cache)             │
│  3. Expands: TOON → JSON (from decoder)                 │
│  4. Executes: Deterministic reasoning                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 **Data Flow: Step-by-Step**

### **Step 1: Raw Data Exists in Database (JSON)**

```json
// Original data in CITI's transaction database
{
  "transaction_id": "T005",
  "customer_id": "C003",
  "amount_inr": 120000,
  "timestamp": "2026-03-02T15:10:00",
  "location": "Dubai",
  "category": "Travel",
  "metadata": {
    "previous_transaction_minutes": 10
  }
}
```

### **Step 2: Convert to TOON (On-Demand)**

```python
def encode_toon(transaction, customer):
    """Convert JSON to TOON format"""
    return f"@{customer['id']}|{customer['age']}|{customer['type'][:3].upper()}|{customer['kyc'][0]}|{customer['risk'][0]}#{transaction['id']}|₹:{transaction['amount_inr']//1000}|{transaction['timestamp'].replace('-','').replace(':','')[:13]}|{LOCATION_CODES[transaction['location']]}|{CATEGORY_CODES[transaction['category']]}|Δ:{transaction['metadata']['previous_transaction_minutes']}m"

# Result: @C003|29|SAV|P|H#T005|₹:120|20260302T1510|DB|TRVL|Δ:10m
```

### **Step 3: Send to LLM (Minimal Payload)**

```xml
<API_CALL>
  <RegistryReference>KIRAN-FRAUD-v1.0</RegistryReference>  <!-- 25 tokens -->
  <TOONPayload>@C003|29|SAV|P|H#T005|₹:120|20260302T1510|DB|TRVL|Δ:10m</TOONPayload>  <!-- 68 tokens -->
  <ContextFlags>
    <Priority>CRITICAL</Priority>
    <AuditLevel>FULL</AuditLevel>
  </ContextFlags>  <!-- 20 tokens -->
</API_CALL>

Total: ~113 tokens vs 3,650 tokens = 97% reduction
```

### **Step 4: LLM Expands and Executes**

The LLM (or middleware) performs:

```
1. Lookup "KIRAN-FRAUD-v1.0" in registry → Get full 2,100 token prompt
2. Decode TOON "@C003..." → Expand to structured JSON
3. Inject decoded data into prompt template
4. Execute deterministic reasoning
5. Return structured output
```

---

## 🔄 **The Complete Data Retrieval Flow**

### **Sequence Diagram**

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────┐     ┌────────┐
│  User   │     │   Devin     │     │   R2D2       │     │  LLM    │     │ Output │
│ Request │     │ Orchestrator│     │  Gateway     │     │  API    │     │        │
└────┬────┘     └──────┬──────┘     └──────┬───────┘     └────┬────┘     └───┬────┘
     │                 │                   │                  │            │
     │ "Check T005"    │                   │                  │            │
     │────────────────>│                   │                  │            │
     │                 │                   │                  │            │
     │                 │ 1. Query KB       │                  │            │
     │                 │  "Get T005 data"  │                  │            │
     │                 │──────────────────>│                  │            │
     │                 │                   │                  │            │
     │                 │ 2. Return JSON    │                  │            │
     │                 │  {"amount":120000 │                  │            │
     │                 │   "location":"Dubai"...}            │            │
     │                 │<──────────────────│                  │            │
     │                 │                   │                  │            │
     │                 │ 3. Encode TOON    │                  │            │
     │                 │  "@C003|...#T005|₹:120|..."         │            │
     │                 │                   │                  │            │
     │                 │ 4. Get Prompt Ref │                  │            │
     │                 │  "KIRAN-FRAUD-v1.0"                 │            │
     │                 │                   │                  │            │
     │                 │ 5. Send to LLM    │                  │            │
     │                 │  {"ref": "KIRAN",  │                 │            │
     │                 │   "data": "@C003..."}               │            │
     │                 │─────────────────────────────────────>│            │
     │                 │                   │                  │            │
     │                 │                   │                  │ 6. Expand  │
     │                 │                   │                  │  ref→prompt│
     │                 │                   │                  │  data→JSON │
     │                 │                   │                  │            │
     │                 │                   │                  │ 7. Execute │
     │                 │                   │                  │  reasoning │
     │                 │                   │                  │            │
     │                 │ 8. Return verdict   │                  │            │
     │                 │  "<SUSPICIOUS>..." │<─────────────────│            │
     │                 │<─────────────────────────────────────│            │
     │                 │                   │                  │            │
     │                 │ 9. Route to LEXA  │                  │            │
     │                 │  (if suspicious)  │                  │            │
     │                 │                   │                  │            │
     │  Result         │                   │                  │            │
     │<────────────────│                   │                  │            │
```

---

## 🎯 **Key Clarifications**

### **What "Registry" Actually Means**

| Misconception | Reality |
|--------------|---------|
| "Registry is inside the LLM" | ❌ Registry is CITI's database (pgvector/Redis) |
| "LLM remembers the prompt" | ❌ Middleware injects prompt before LLM sees it |
| "We send compressed instructions" | ❌ We send **reference**, LLM gets full prompt from cache |

### **What TOON Actually Compresses**

| Component | Format | Compressed? | Where Stored |
|-----------|--------|-------------|--------------|
| **Agent Instructions** (KIRAN's rules) | XML | ❌ No | Prompt Registry (CITI's DB) |
| **Transaction Data** (T005 details) | TOON | ✅ Yes | Sent with API call |
| **Customer Profile** (C003 info) | TOON | ✅ Yes | Sent with API call |
| **Output Template** | XML | ❌ No | Part of registry prompt |

---

## 💻 **Concrete Code Example**

```python
class ARIASystem:
    def __init__(self):
        self.prompt_registry = PromptRegistry()  # CITI's pgvector
        self.knowledge_base = KnowledgeBase()    # CITI's transaction DB
        self.toon_encoder = TOONEncoder()
    
    def process_transaction(self, txn_id: str) -> dict:
        # Step 1: Retrieve raw data from CITI's database
        raw_data = self.knowledge_base.get_transaction(txn_id)
        # Returns: {"txn": {...}, "customer": {...}}
        
        # Step 2: Convert to TOON (compress for transmission)
        toon_packet = self.toon_encoder.encode(
            transaction=raw_data['txn'],
            customer=raw_data['customer']
        )
        # Result: "@C003|29|SAV|P|H#T005|₹:120|20260302T1510|DB|TRVL|Δ:10m"
        
        # Step 3: Get prompt reference (NOT full text)
        prompt_ref = "KIRAN-FRAUD-v1.0"
        
        # Step 4: Call LLM with minimal payload
        kiran_result = self.call_llm(
            prompt_ref=prompt_ref,      # 25 tokens
            toon_data=toon_packet,       # 68 tokens
            context={"priority": "HIGH"} # 15 tokens
        )
        # Total: ~108 tokens vs 3,650 traditional = 97% savings
        
        # Step 5: If suspicious, route to LEXA
        if kiran_result['verdict'] == 'SUSPICIOUS':
            lexa_result = self.call_llm(
                prompt_ref="LEXA-REPORT-v1.0",
                toon_data=toon_packet,
                upstream_data=kiran_result
            )
            return lexa_result
        
        return kiran_result
    
    def call_llm(self, prompt_ref: str, toon_data: str, context: dict):
        """
        Actual API call - minimal payload
        """
        # This is what gets sent over the wire (tiny!)
        payload = {
            "registry_ref": prompt_ref,  # "KIRAN-FRAUD-v1.0"
            "toon_payload": toon_data,    # "@C003|29|SAV|P|H#T005..."
            "context": context            # {"priority": "HIGH"}
        }
        
        # Middleware (or LLM provider) expands this:
        # 1. Lookup prompt_ref → Get full 2,100 token XML
        # 2. Decode toon_data → Get structured JSON
        # 3. Combine and execute
        
        response = requests.post("https://api.citi.ai/aria", json=payload)
        return response.json()


class PromptRegistry:
    """
    CITI's internal registry - stores full prompts
    """
    def __init__(self):
        self.db = PostgreSQL()  # CITI's existing pgvector
    
    def get_prompt(self, ref: str) -> str:
        """
        Retrieve full prompt text by reference ID
        """
        return self.db.query(
            "SELECT prompt_text FROM aria_prompts WHERE ref_id = %s", 
            ref
        )
        # Returns full KIRAN XML (2,100 tokens) from cache


class TOONEncoder:
    """
    Compresses JSON transaction data to TOON format
    """
    def encode(self, transaction: dict, customer: dict) -> str:
        return (
            f"@{customer['id']}|"
            f"{customer['age']}|"
            f"{customer['type'][:3].upper()}|"
            f"{customer['kyc'][0]}|"
            f"{customer['risk'][0]}"
            f"#{transaction['id']}|"
            f"₹:{transaction['amount_inr']//1000}|"
            f"{transaction['timestamp'].replace('-','').replace(':','')[:13]}|"
            f"{self.location_code(transaction['location'])}|"
            f"{self.category_code(transaction['category'])}"
            f"|Δ:{transaction.get('delta_minutes', 0)}m"
        )
    
    def decode(self, toon: str) -> dict:
        """
        Expand TOON back to structured data
        """
        # Reverse the encoding process
        parts = toon.split('#')
        customer_part = parts[0].lstrip('@')
        txn_part = parts[1]
        
        c_fields = customer_part.split('|')
        t_fields = txn_part.split('|')
        
        return {
            "customer": {
                "id": c_fields[0],
                "age": int(c_fields[1]),
                "type": self.expand_type(c_fields[2]),
                "kyc": self.expand_kyc(c_fields[3]),
                "risk": self.expand_risk(c_fields[4])
            },
            "transaction": {
                "id": t_fields[0],
                "amount_inr": float(t_fields[1].replace('₹:', '')) * 1000,
                # ... etc
            }
        }
```

---

## 📊 **Summary: What Gets Sent Where**

| Layer | Content | Size | Destination |
|-------|---------|------|-------------|
| **Prompt Registry** | Full KIRAN XML (2,100 tokens) | Stored in CITI DB | Never sent over wire |
| **API Call** | `{"ref": "KIRAN-v1.0", "data": "@C003..."}` | ~110 tokens | Sent to LLM |
| **LLM Expansion** | Full prompt + decoded data | ~2,200 tokens | Internal to LLM |
| **Response** | Structured XML verdict | ~200 tokens | Returned to CITI |

**The 99% savings comes from:** Never sending the 2,100 token instructions over the network. They're cached and referenced instead.

**The 60% TOON savings comes from:** Compressing the variable data (transactions, customers) from ~300 token JSON to ~68 token TOON.

**Combined:** 3,650 tokens → 110 tokens = **97% total reduction**
# 🛡️ Dark Web Exposure Monitor

### **Cyber Threat Intelligence Prototype**
*A proactive system to monitor leaked credential datasets and alert users about potential risks in a simplified and accessible manner.*

---

## 🚀 Overview
**Dark Web Exposure Monitor** is a production-grade threat intelligence dashboard designed to scan massive datasets of leaked credentials. It simulates dark web monitoring by cross-referencing user inputs against a database of **15,000+ unique emails**, **50,000+ data exposures**, and **hundreds of known leaked password hashes**.

Built with a **pixel-perfect UI** matching Figma specifications and a **secure k-Anonymity architecture**, this project provides actionable insights and risk scoring to help users secure their digital identities before exploitation occurs.

---

## ✨ Key Features

### 📧 Email Breach Detection
Check if your email address appears in any of our 13+ major integrated leak intelligence feeds (Equifax, LinkedIn, Canva, Yahoo, and more).
- **Detailed Analytics**: See exactly *what* was leaked (SSN, Passwords, Names, DOB).
- **Dynamic Risk Scoring**: A real-time engine calculates a score (0-100) based on breach severity, volume, and data sensitivity.

### 🏢 Domain-Level Monitoring (B2B Mode)
Simulate an enterprise security scan. Enter a corporate domain (e.g., `apple.com`) to view privacy-safe **aggregated risk analytics** and exposure density.

### 🔐 Secure Password Check (k-Anonymity)
A privacy-first password scanner.
- **Local Hashing**: The password is hashed (SHA-1) locally in your browser.
- **Zero-Knowledge**: Only the first 5 characters of the hash reach our API. We return matching suffixes, and the browser performs the final comparison. **Your plaintext password never leaves your machine.**

### 🛠️ Dynamic Mitigation Playbooks
Instead of generic advice, our backend generates **context-aware recommendations**.
- If an **SSN** is leaked: Guided steps to freeze credit bureaus.
- If a **Password** is leaked: Immediate prompts to update credentials and enable 2FA.

### 📥 Lawful Metadata Importer (Non-PII)
Import only **breach metadata** from public/legal sources.
- JSON and CSV ingestion
- Validation + dedupe (`name + date`)
- Upsert support and import run audit table
- Sensitive direct-record fields are rejected (`emails`, `records`, etc.)

### 🌐 Optional Live k-Anonymity Range Lookup
Password prefix checks can optionally fall back to a public range API when local hash data has no match.
- Prefix-only lookup (k-anonymity)
- No plaintext password transfer
- Controlled by env var: `USE_LIVE_K_ANON_API=1`

---

## 🛠️ Tech Stack

- **Frontend**: ReactJS, TypeScript, Tailwind CSS (Vite)
- **Backend**: FastAPI (Python 3.10+)
- **Database**: SQLite (Self-contained, no external setup required)
- **Design**: Figma Pixel-Perfect Implementation (Custom Radials & Linear Gradients)

---

## 🏁 Setup Instructions

### 1. Clone & Initialize Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt  # Or manually: fastapi uvicorn pydantic pydantic-settings
python seed_data.py             # ⚠️ CRITICAL: Populates the database with 15,000+ records
```

### 2. Initialize Frontend
```bash
cd frontend
npm install
```

### 3. Run the Servers
**Tab 1 (Backend):**
```bash
cd backend && source venv/bin/activate
uvicorn app.main:app --reload
```

**Tab 2 (Frontend):**
```bash
cd frontend
npm run dev
```

---

## 📦 Safe Metadata Import Workflow
Use this to enrich breach intel without ingesting leaked personal records.

```bash
cd backend
source venv/bin/activate

# Validate only
python import_breach_metadata.py data/breach_metadata.sample.json --dry-run

# Import JSON
python import_breach_metadata.py data/breach_metadata.sample.json

# Import CSV
python import_breach_metadata.py data/breach_metadata.sample.csv
```

Accepted fields:
- `name` (required)
- `date` (`YYYY-MM-DD`)
- `severity` (`0-10`)
- `domains` (array or comma-separated)
- `compromised_data` (array or comma-separated)
- `source_url` (optional)

Rejected sensitive fields:
- `email`, `emails`, `records`, `passwords`, `samples`

---

## 🧑‍⚖️ Guide for Hackathon Judges

To see the project's full power, we recommend testing the following "Gold Path" scenarios:

### 1. The "High Risk" Target
Search for **`exposed@example.com`** in the **Email Search** tab.
- **Observe**: The 100/100 risk score, the thick custom SVG progress ring, and the detailed breakdown of the Equifax and LinkedIn breaches.

### 2. The Enterprise Scan
Go to the **Domain Search** tab and search for **`google.com`** or **`microsoft.com`**.
- **Observe**: The dashboard returns privacy-safe domain risk analytics and breach-type distribution, showing infrastructure-level exposure without revealing individual accounts.

### 3. The Privacy-First Password Check
Go to the **Password Check** tab and type **`password123`**.
- **Observe**: Our system identifies it has been leaked millions of times. Then try a complex string like `Hackathon_Winner_2026!`.
- **Note**: Check the Network tab in DevTools—you'll see that the actual password is never sent to our server!

### 4. Figma Fidelity
Compare the running app to the `Dark Web Exposure Monitor.png` file in the root. 
- **Highlights**: One solid diamond gradient background, custom themed scrollbars, and nested "Capsule" UI elements in the Exposure Summary.

---

## 🛡️ Security & Privacy
This prototype implements industry-standard privacy protocols. We utilize **k-Anonymity** for password lookups, ensuring that users can check their security status without compromising their current credentials to the very tool they are using.

---
*Developed for the April 2026 Cyber Security Hackathon.*

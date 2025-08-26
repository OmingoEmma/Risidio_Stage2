# AI + Web3 WhatsApp Assistant with Escrow & Trust Layer

> One-day case study prototype for Lunim Innovation Studio (Stage 2).  
> **Live Demo:**  https://your-vercel-demo-url.vercel.app  
> **GitHub Repo:**  https://github.com/yourname/ai-web3-whatsapp-escrow  
> **Summary Doc (Why/What/Who/How):**  link-to-google-doc-or-md  

---

## 1) Overview

Small businesses live on WhatsApp, but chat-based bookings still suffer from missed messages and low trust around payments.  
This prototype combines:
- **AI chat automation** for bookings + FAQs, and
- **Web3 escrow** to hold funds safely until service completion.

**Goal:** Show a trust-first booking flow that’s shippable in a day and extensible for production.

---

## 2) Demo Snapshot

- **Flow:** User chats → chooses service/time → receives escrow link → pays → funds locked → provider marks “delivered” → funds released.
- **WhatsApp UI:** Simulated in a **mock web UI** for speed; can later be wired to WhatsApp Business API (Twilio/Meta Cloud API).

**Screenshots**
- UI – Booking flow: `./docs/screenshots/ui-booking.png`
- UI – Payment locked: `./docs/screenshots/ui-escrow-locked.png`
- UI – Release funds: `./docs/screenshots/ui-escrow-released.png`
- Contract txn on explorer: `./docs/screenshots/explorer.png`

---

## 3) Architecture
[React/Next.js UI] ── calls ──> [API Routes / Node]
│ │
│ ├── uses OpenAI for AI replies (mocked or live)
│ └── uses Ethers.js to interact with Escrow.sol
│
└──────────────> [Smart Contract: Escrow.sol (Testnet e.g., Polygon Amoy)]

- **UI:** Next.js (Vercel) simulating WhatsApp-like chat + booking flow  
- **AI:** OpenAI API (or mocked responses for timeboxing)  
- **Web3:** Hardhat + Ethers.js + `Escrow.sol` (testnet deployment)  

---

## 4) Features

- **AI Assistant**
  - Captures booking details (service, date, time, location, contact)
  - Answers FAQs (hours, pricing, policies)
  - Generates human-readable booking summary

- **Escrow Smart Contract**
  - `createEscrow(buyer, seller, amount)`
  - `releaseToSeller(escrowId)` (provider confirms service delivered)
  - `refundToBuyer(escrowId)` (dispute path for demo)
  - Emits events for UI status

- **Trust UX**
  - Clear status badges: `Awaiting Payment` → `Funds Locked` → `Released`
  - Copyable transaction hash + explorer link
  - Human-friendly summaries of terms

---

## 5) Tech Stack

- **Frontend:** Next.js (React), Vercel deploy, Tailwind (optional)
- **Backend/API:** Next.js API routes (Node 18+)
- **AI:** OpenAI API (`gpt-4o-mini` or similar) — can be mocked
- **Blockchain:** Solidity (Escrow.sol), Hardhat, Ethers.js, Polygon Amoy testnet (or Sepolia)
- **Tooling:** TypeScript, dotenv, Prettier/ESLint

---

## 6) Quick Start (Local)

### Prerequisites
- Node.js 18+
- PNPM or NPM
- A testnet wallet with small faucet funds (for gas)
- **Optional:** OpenAI API key (or switch `USE_AI=mock`)

### 6.1 Clone & Install
```bash
git clone  your-repo-url
cd ai-web3-whatsapp-escrow
pnpm install   # or: npm install

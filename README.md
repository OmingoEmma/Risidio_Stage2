# AI-Powered Escrow and Booking Demo

## Overview
This project demonstrates a prototype escrow payment system combined with an AI-assisted booking/chat interface. The goal is to simulate a WhatsApp-style user experience for service booking, guided by AI prompts, while securing payments on-chain using a smart contract.  

The prototype was built as part of the **Lunim Studio Stage 2 Case Study Challenge**, showcasing the integration of:
- Human-centric design (conversational UI)
- AI integration (mock and live modes)
- Web3 smart contracts (escrow system on Polygon testnet)

This project is **not production-ready**. It is optimized for demonstration and learning purposes, focusing on clarity, speed-to-value, and integration of multiple technologies in one flow.

---

## Concept

### Problem
Service providers and clients often face challenges in:
- Trusting each other in advance payments  
- Handling disputes in bookings  
- Managing real-time communication across chat platforms  

### Solution
This prototype combines:
1. **Escrow Smart Contract**:  
   - Funds are locked by the buyer.  
   - Funds are only released when the service is marked delivered.  
   - Refund and expiry mechanisms are included for dispute resolution.  

2. **AI-Powered Booking Assistant**:  
   - Guides users through booking a service (service type, date, time, location, price).  
   - Operates in **mock mode** (predefined responses) or **live mode** (OpenAI API).  

3. **WhatsApp-Style Interface**:  
   - Chat bubbles with timestamps and typing indicators.  
   - Booking form for structured data collection.  
   - Real-time status updates (Awaiting Payment → Funds Locked → Released/Refunded/Expired).  

---

## Features

- **Escrow Smart Contract** (`contracts/Escrow.sol`):
  - Create and fund escrows
  - Release funds to seller (only by buyer)
  - Refund to buyer (pre-release, by buyer/seller)
  - Expire mechanism (buyer can refund after deadline)
  - Events emitted for all state changes
  - Unit tested with Hardhat  

- **Next.js Web App** (`/web`):
  - WhatsApp-style chat interface
  - Booking form with validation
  - Real-time transaction status
  - API routes to interact with the escrow contract
  - Configurable AI responses  

- **Integration**:
  - Contract deployed on **Polygon Amoy Testnet**
  - Transactions linked to **PolygonScan Explorer**
  - Alchemy RPC for blockchain access
  - Vercel-ready deployment  

---

## Tech Stack

- **Blockchain / Smart Contracts**:
  - Solidity ^0.8.20
  - Hardhat (compile, deploy, test, verify)
  - Ethers v6
  - Polygon Amoy Testnet
  - Alchemy RPC
  - PolygonScan API

- **Frontend**:
  - Next.js 14
  - Tailwind CSS
  - React (functional components, hooks)
  - Booking + chat UI

- **Backend / API Routes**:
  - Next.js API routes
  - Ethers.js for blockchain interaction
  - dotenv for environment management

- **AI**:
  - OpenAI API (optional, when `USE_AI=live`)
  - Mock mode for demo

---

## Installation and Setup

### Prerequisites
- Node.js v18 or higher
- npm v9 or higher
- A funded Polygon Amoy testnet wallet (faucet required for gas)
- Alchemy API key for Polygon Amoy
- PolygonScan API key (for contract verification, optional)
- (Optional) OpenAI API key if using live AI

---

### 1. Clone the repository
```bash
git clone https://github.com/OmingoEmma/Risidio_Stage2.git
cd Risidio_Stage2

2. Install dependencies
npm install

3. Environment variables
Root .env
PRIVATE_KEY=0x<your-wallet-private-key>
POLYGON_AMOY_RPC=https://polygon-amoy.g.alchemy.com/v2/<your-alchemy-key>
POLYGONSCAN_API_KEY=<your-polygonscan-key>

Frontend .env.local (inside /web)
# Server (API routes)
PRIVATE_KEY=0x<your-wallet-private-key>
POLYGON_AMOY_RPC=https://polygon-amoy.g.alchemy.com/v2/<your-alchemy-key>

# Frontend (public)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x<fill-after-deploy>
NEXT_PUBLIC_EXPLORER_BASE=https://amoy.polygonscan.com
NEXT_PUBLIC_CHAIN_ID=80002

# AI
USE_AI=mock              # or "live"
OPENAI_API_KEY=sk-...    # only if using live AI

4. Compile and Test Contracts
npm run compile
npm test

5. Deploy Contract
npm run deploy:amoy


Copy the printed contract address into /web/.env.local as NEXT_PUBLIC_CONTRACT_ADDRESS.

6. Run the Frontend
cd web
npm install
npm run dev


Visit http://localhost:3000
.

Deployment
Vercel

Connect GitHub repo to Vercel.

Add environment variables from .env.local and .env in Project Settings.

Deploy → app will be available at your Vercel domain.

PolygonScan Verification
npx hardhat verify --network amoy <DEPLOYED_ESCROW_ADDRESS>

Demo Flow

User fills out the booking form (service, date, time, location, seller address, amount).

User clicks Lock Payment → escrow contract is created and funded.

Status updates to Funds Locked, with a PolygonScan link.

Buyer can click Mark Delivered (release funds) or Refund.

If the deadline expires, the buyer can claim a refund.

Development Constraints

Testnet-only (Amoy MATIC required)

Demo security (not production-hardened)

No advanced dispute resolution

Minimal input validation

Future Enhancements

Add dispute resolution with third-party arbitrators

Multi-party escrow with milestones

Production-grade security audits

SMS/WhatsApp integration with Twilio

Database logging of conversations and transactions

AI personalization based on user profiles

License

MIT License. See LICENSE file for details.


---

Do you want me to also create a **/docs folder** with screenshots placeholders + an **architecture diagram (MDX/PNG)** so your GitHub repo looks more professional?

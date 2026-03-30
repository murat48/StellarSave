# StellarSave — Decentralized Savings dApp on Stellar Testnet

[![CI](https://github.com/murat48/StellarSave/actions/workflows/ci.yml/badge.svg)](https://github.com/murat48/StellarSave/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Stellar Testnet](https://img.shields.io/badge/Network-Stellar%20Testnet-blue)](https://testnet.steexp.com)

> **Live Demo:** [https://stellarsave.vercel.app](https://stellarsave.vercel.app) *(deploy sonrası güncellenecek)*

---

## What is StellarSave?

StellarSave is a fully on-chain DeFi savings application built on the **Stellar blockchain** using **Soroban smart contracts**. Users connect their Stellar wallet, receive test SAVE tokens via the faucet, lock them for a chosen period, and automatically earn 5% APY rewards when they withdraw — all without any intermediary.

### Key Features

- 🔐 **Multi-wallet support** — Freighter, xBull, Albedo, Lobstr, WalletConnect via `@creit-tech/stellar-wallets-kit`
- 🪙 **Custom SAVE token** — SEP-0041 compliant Soroban token contract
- 🔒 **Time-locked savings** — lock funds for 1 week / 1 month / 3 months
- 🎁 **Automatic rewards** — 5% APY, minted on-chain at withdrawal
- 📱 **Mobile-first responsive UI** — Tailwind CSS, works on 375px+
- 🤖 **CI/CD pipeline** — GitHub Actions → auto-deploy to Vercel

---

## Contract Addresses (Stellar Testnet)

| Contract    | Address               | Network          |
|-------------|-----------------------|------------------|
| SAVE Token  | `C...` *(after deploy)* | Stellar Testnet |
| Savings     | `C...` *(after deploy)* | Stellar Testnet |
| Rewards     | `C...` *(after deploy)* | Stellar Testnet |

> Run `./scripts/deploy.sh` to deploy and auto-populate `frontend/.env`.

---

## Architecture — Inter-Contract Calls

```
User Wallet
     │
     ▼
┌─────────────────────────────────────────────────┐
│              SAVINGS CONTRACT                   │
│                                                 │
│  deposit(user, amount, lock_period)             │
│    ──► token.transfer_from(user → savings)      │
│                                                 │
│  withdraw(user)                                 │
│    ──► token.transfer(savings → user)           │
│    ──► rewards.calculate_and_pay(user, ...)     │
└─────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
┌──────────────────┐   ┌──────────────────────────┐
│  TOKEN CONTRACT  │   │     REWARDS CONTRACT     │
│  (SEP-0041)      │   │                          │
│  - transfer      │◄──│  calculate_and_pay()     │
│  - transfer_from │   │    reward = principal    │
│  - mint          │   │      × 5%                │
│  - approve       │   │      × (duration/100000) │
│  - balance       │   │  ──► token.mint(user)    │
└──────────────────┘   └──────────────────────────┘
```

**Reward formula:**
$$\text{reward} = \text{principal} \times 0.05 \times \frac{\text{duration\_ledgers}}{100000}$$

---

## Tech Stack

| Layer       | Technology                               |
|-------------|------------------------------------------|
| Blockchain  | Stellar Testnet (Soroban)                |
| Contracts   | Rust + Soroban SDK                       |
| Frontend    | React 18 + Vite + TypeScript             |
| Styling     | Tailwind CSS v4                          |
| Wallet      | @creit-tech/stellar-wallets-kit          |
| SDK         | stellar-sdk                             |
| CI/CD       | GitHub Actions + Vercel                  |

---

## Local Development

### Prerequisites

- [Rust + `wasm32-unknown-unknown` target](https://www.rust-lang.org/tools/install)
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)
- [Node.js 20+](https://nodejs.org)
- [Freighter wallet](https://freighter.app) (browser extension)

### 1. Clone & install

```bash
git clone https://github.com/murat48/StellarSave.git
cd StellarSave
cd frontend && npm install
```

### 2. Configure environment

```bash
cp frontend/.env.example frontend/.env
# Edit .env with your deployed contract IDs
```

### 3. Deploy contracts (testnet)

```bash
export STELLAR_SECRET=your_testnet_secret_key
./scripts/deploy.sh
# Contract IDs will be written to frontend/.env automatically
```

### 4. Fund your account

Use the Stellar testnet faucet:
```bash
curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"
```

Or use the **Token Faucet** built into the app UI.

### 5. Run the frontend

```bash
cd frontend && npm run dev
# Open http://localhost:5173
```

---

## Project Structure

```
StellarSave/
├── contracts/
│   ├── Cargo.toml               # Workspace
│   ├── token/src/lib.rs         # SAVE token (SEP-0041)
│   ├── savings/src/lib.rs       # Savings + lock logic
│   └── rewards/src/lib.rs       # Reward calculation + mint
├── frontend/
│   ├── src/
│   │   ├── contexts/
│   │   │   └── WalletContext.tsx    # StellarWalletsKit context
│   │   ├── hooks/
│   │   │   └── useStellarContract.ts # Soroban contract calls
│   │   └── components/
│   │       ├── Dashboard.tsx        # 4-card stats overview
│   │       ├── DepositForm.tsx      # Approve + lock tokens
│   │       ├── WithdrawSection.tsx  # Countdown + withdraw
│   │       ├── TokenFaucet.tsx      # Get test SAVE tokens
│   │       └── WalletButton.tsx     # Multi-wallet connect
│   └── .env.example
├── scripts/
│   └── deploy.sh                # Build + deploy + write .env
└── .github/workflows/ci.yml     # CI: test + build + deploy
```

---

## Lock Periods

| Period   | Ledgers   | Approx. Time |
|----------|-----------|--------------|
| 1 Week   | 50,400    | ~7 days      |
| 1 Month  | 201,600   | ~28 days     |
| 3 Months | 604,800   | ~84 days     |

> 1 Stellar ledger ≈ 5 seconds

---

## Token Details

| Property | Value       |
|----------|-------------|
| Name     | SaveToken   |
| Symbol   | SAVE        |
| Decimals | 7           |
| Network  | Testnet     |

> 1 SAVE = 10,000,000 stroops (7 decimal places)

---

## CI/CD Pipeline

```
git push origin main
       │
       ▼
GitHub Actions
  ├── test-contracts   (cargo test + soroban build)
  ├── test-frontend    (tsc + vite build)
  └── deploy           (Vercel, only on main)
```

Required GitHub Secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

---

## Contributing

1. Fork this repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit: `git commit -m "feat: description"`
4. Push & open a PR against `main`

---

## License

MIT © 2026 murat48

## PROJECT OVERVIEW

A decentralized savings app where users:

1. Connect their Stellar wallet using @creit-tech/stellar-wallets-kit
2. Create a custom "SAVE" token (Soroban)
3. Lock funds for a set period
4. Earn rewards when the period ends

## TECH STACK

- Blockchain: Stellar testnet (Soroban smart contracts)
- Language: Rust (Soroban SDK)
- Frontend: React + Vite + TypeScript
- Styling: Tailwind CSS (mobile responsive)
- Wallet: @creit-tech/stellar-wallets-kit (supports Freighter, xBull, Albedo, Lobstr, WalletConnect)
- CI/CD: GitHub Actions

---

## STEP 1 – PROJECT SETUP

Create this folder structure:
stellarsave/
├── contracts/
│ ├── token/
│ ├── savings/
│ └── rewards/
├── frontend/
│ ├── src/
│ │ ├── components/
│ │ ├── hooks/
│ │ ├── utils/
│ │ └── contexts/
├── .github/
│ └── workflows/
│ └── ci.yml
└── README.md

Install dependencies:
npm install @creit-tech/stellar-wallets-kit stellar-sdk
npm install -D tailwindcss vite @vitejs/plugin-react typescript

### ✅ After completing STEP 1, run these commands:

```bash
git add .
git commit -m "init: project structure and dependencies"
git push origin main
```

Then tell me "committed" to proceed to STEP 2.

---

## STEP 2 – WALLET KIT SETUP

### Create contexts/WalletContext.tsx

Use @creit-tech/stellar-wallets-kit to:

```typescript
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from "@creit-tech/stellar-wallets-kit";

const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: allowAllModules(),
});

interface WalletContextType {
  kit: StellarWalletsKit;
  address: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string) => Promise<string>;
}

// connect() function must:
// 1. Call kit.openModal({ onWalletSelected: async (option) => { ... } })
// 2. After selection: kit.setWallet(option.id)
// 3. Get address: const { address } = await kit.getAddress()
// 4. Save address to state
```

### Create components/WalletButton.tsx

- If not connected: show "Connect Wallet" button → opens kit modal
- If connected: show truncated address (first 4...last 4 chars) + disconnect button
- Modal shows all available wallets (Freighter, xBull, Albedo, Lobstr, WalletConnect)
- Mobile responsive: full width on mobile, auto on desktop

### ✅ After completing STEP 2, run these commands:

```bash
git add frontend/src/contexts/WalletContext.tsx
git add frontend/src/components/WalletButton.tsx
git commit -m "feat: wallet kit integration with multi-wallet support"
git push origin main
```

Then tell me "committed" to proceed to STEP 3.

---

## STEP 3 – CUSTOM TOKEN CONTRACT (contracts/token/)

Write a Soroban smart contract in Rust that:

- Implements SEP-0041 Stellar token interface
- Token name: "SaveToken", symbol: "SAVE", decimals: 7
- Functions:
  - initialize(admin, decimal, name, symbol)
  - mint(to, amount) → only admin
  - balance(id) → returns balance
  - transfer(from, to, amount)
  - approve(from, spender, amount, expiration_ledger)
  - transfer_from(spender, from, to, amount)

### ✅ After completing STEP 3, run these commands:

```bash
git add contracts/token/
git commit -m "feat: deploy custom SAVE token contract to testnet"
git push origin main
```

Then tell me "committed" to proceed to STEP 4.

---

## STEP 4 – SAVINGS CONTRACT (contracts/savings/)

Write a Soroban smart contract in Rust that:

- Makes INTER-CONTRACT CALL to token contract
- Storage: map of user → SavingsRecord { amount, start_ledger, lock_period, is_active }
- Functions:
  - initialize(token_contract_id, reward_contract_id)
  - deposit(user, amount, lock_period_in_ledgers)
    → calls token_contract.transfer_from(user, contract, amount)
  - withdraw(user)
    → checks lock_period passed
    → calls token_contract.transfer(contract, user, amount)
    → calls reward_contract.calculate_and_pay(user, amount, duration)
  - get_savings(user) → returns SavingsRecord
  - get_time_remaining(user) → returns ledgers remaining

### ✅ After completing STEP 4, run these commands:

```bash
git add contracts/savings/
git commit -m "feat: savings contract with inter-contract calls"
git push origin main
```

Then tell me "committed" to proceed to STEP 5.

---

## STEP 5 – REWARDS CONTRACT (contracts/rewards/)

Write a Soroban smart contract in Rust that:

- Makes INTER-CONTRACT CALL to token contract to mint rewards
- Functions:
  - initialize(token_contract_id, savings_contract_id)
  - calculate_and_pay(user, principal, duration_ledgers)
    → reward = principal _ 5% _ (duration / 100000)
    → calls token_contract.mint(user, reward_amount)
    → only callable by savings_contract
  - get_apy() → returns 5

### ✅ After completing STEP 5, run these commands:

```bash
git add contracts/rewards/
git commit -m "feat: rewards contract with auto mint on withdraw"
git push origin main
```

Then tell me "committed" to proceed to STEP 6.

---

## STEP 6 – DEPLOY CONTRACTS

Write deploy scripts:

1. soroban contract build (all 3)
2. Deploy token → save address
3. Deploy savings → save address
4. Deploy rewards → save address
5. Initialize all with correct addresses
6. Output to frontend/.env:
   VITE_TOKEN_CONTRACT_ID=...
   VITE_SAVINGS_CONTRACT_ID=...
   VITE_REWARDS_CONTRACT_ID=...
   VITE_NETWORK=TESTNET
   VITE_HORIZON_URL=https://horizon-testnet.stellar.org
   VITE_RPC_URL=https://soroban-testnet.stellar.org

### ✅ After completing STEP 6, run these commands:

```bash
git add scripts/
git add frontend/.env.example
git commit -m "feat: contract deploy scripts and environment setup"
git push origin main
```

Then tell me "committed" to proceed to STEP 7.

---

## STEP 7 – FRONTEND COMPONENTS

### hooks/useStellarContract.ts

```typescript
// Helper hook to call Soroban contracts using wallet kit
// Uses stellar-sdk SorobanRpc.Server
// signTransaction must use: kit.signTransaction(xdr, { network: WalletNetwork.TESTNET })
```

### components/Dashboard.tsx

- 4 cards: Current Savings / Time Remaining / Expected Reward / APY
- Mobile: 1 column stack
- Desktop: 2x2 grid
- Real-time data from savings contract

### components/DepositForm.tsx

- Amount input (SAVE tokens)
- Lock period selector:
  - "1 Week" = 50400 ledgers
  - "1 Month" = 201600 ledgers
  - "3 Months" = 604800 ledgers
- "Approve & Lock" button (2-step: approve token → deposit)
- Uses kit.signTransaction() for both transactions

### components/WithdrawSection.tsx

- Shows: locked amount, unlock date, expected reward
- Countdown timer (days/hours/minutes)
- "Withdraw & Claim Reward" button (disabled if still locked)
- Uses kit.signTransaction()

### components/TokenFaucet.tsx

- "Get Test SAVE Tokens" button
- Calls token contract mint function (testnet only)
- Shows current balance

### App.tsx layout

- Header: logo + WalletButton (sticky, mobile hamburger)
- Main: Dashboard + DepositForm + WithdrawSection + TokenFaucet
- Footer: contract addresses + testnet badge
- Fully mobile responsive with Tailwind

### ✅ After completing STEP 7, run these commands:

```bash
git add frontend/src/components/
git add frontend/src/hooks/
git add frontend/src/contexts/
git commit -m "feat: frontend dashboard and deposit/withdraw UI"
git push origin main
```

Then tell me "committed" to proceed to STEP 8.

---

## STEP 8 – MOBILE RESPONSIVE DESIGN

Make all components fully mobile responsive:

- Breakpoints: sm (640px), md (768px), lg (1024px)
- Dashboard: 1 col on mobile → 2x2 grid on desktop
- DepositForm: full width inputs on mobile
- Header: hamburger menu on mobile
- All buttons: full width on mobile
- Test on 375px (iPhone SE) and 390px (iPhone 14)

### ✅ After completing STEP 8, run these commands:

```bash
git add frontend/src/
git commit -m "feat: mobile responsive design with Tailwind"
git push origin main
```

Then tell me "committed" to proceed to STEP 9.

---

## STEP 9 – CI/CD (.github/workflows/ci.yml)

Create GitHub Actions workflow:

```yaml
name: StellarSave CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: wasm32-unknown-unknown
      - name: Install Soroban CLI
        run: cargo install --locked soroban-cli
      - name: Build Contracts
        run: cd contracts && soroban contract build
      - name: Test Contracts
        run: cd contracts && cargo test

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Type check
        run: cd frontend && npm run type-check
      - name: Build
        run: cd frontend && npm run build

  deploy:
    needs: [test-contracts, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
```

### ✅ After completing STEP 9, run these commands:

```bash
git add .github/
git commit -m "ci: GitHub Actions pipeline for contracts and frontend"
git push origin main
```

Then tell me "committed" to proceed to STEP 10.

---

## STEP 10 – README.md

Write a complete README with:

- Project description and features
- Live demo link placeholder
- Screenshots section (mobile + CI/CD badge)
- Contract addresses table:
  | Contract | Address | Network |
  |----------|---------|---------|
  | SAVE Token | C... | Stellar Testnet |
  | Savings | C... | Stellar Testnet |
  | Rewards | C... | Stellar Testnet |
- Setup instructions (local dev)
- How inter-contract calls work (diagram)
- CI/CD badge: [![CI](https://github.com/USERNAME/stellarsave/actions/workflows/ci.yml/badge.svg)]

### ✅ After completing STEP 10, run these commands:

```bash
git add README.md
git commit -m "docs: complete README with screenshots and addresses"
git push origin main
```

🎉 PROJECT COMPLETE!

---

## IMPORTANT RULES

- Always use WalletNetwork.TESTNET (never mainnet)
- All Soroban contract calls need signTransaction from wallet kit
- Token amounts use 7 decimals (1 SAVE = 10000000 stroops)
- Test with Stellar testnet faucet: https://friendbot.stellar.org
- Soroban RPC: https://soroban-testnet.stellar.org
- Build each step completely before moving to next
- After each step show the exact git commands to run
- WAIT for me to say "committed" before starting next step
- If I say "committed", "done", or "next" → proceed to next step

Start with STEP 1 and wait for my confirmation before proceeding.

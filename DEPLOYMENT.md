# StellarSave - Production Deployment Guide

## Overview

StellarSave is a decentralized savings application built on Stellar smart contracts with inter-contract communication for deposits, withdrawals, and reward calculations.

## Architecture

### Smart Contracts

1. **SaveToken** (`token/`): Custom ERC20-like token on Stellar
   - Minting, transfers, approvals
   - Faucet function for testnet
   - Admin-controlled initialization

2. **SavingsContract** (`savings/`): User deposit/withdrawal management
   - Deposit funds with lock periods
   - Automatic reward calculation through inter-contract calls
   - Withdrawal with time-based access control

3. **RewardsContract** (`rewards/`): 5% APY reward calculation
   - Called by SavingsContract on withdrawals
   - Dynamically computes rewards: `5 * principal * duration / (100 * 100_000)`
   - Automatically mints reward tokens

### Frontend

React 19 + TypeScript + Vite + Tailwind CSS
- Mobile responsive UI
- Wallet integration (Freighter)
- Real-time contract state synchronization

## Inter-Contract Communication Flow

```
User Deposit
    ↓
SavingsContract.deposit()
    ↓ (on withdrawal)
RewardsContract.calculate_and_pay()
    ↓
SaveToken.mint() → Reward tokens minted to user
```

## Deploy to Production

### 1. Build Contracts

```bash
cd contracts
stellar contract build
# Generates .wasm files in target/wasm32v1-none/release/
```

### 2. Deploy to Testnet

```bash
# Fund your account with testnet Stellar XLM
# https://laboratory.stellar.org/

# Deploy contracts (in order)
stellar contract deploy \
  --network testnet \
  --source <your-key> \
  --wasm target/wasm32v1-none/release/soroban_save_token.wasm

stellar contract deploy \
  --network testnet \
  --source <your-key> \
  --wasm target/wasm32v1-none/release/soroban_rewards.wasm

stellar contract deploy \
  --network testnet \
  --source <your-key> \
  --wasm target/wasm32v1-none/release/soroban_savings.wasm
```

### 3. Initialize Contracts

```bash
# Token initialization
stellar contract invoke \
  --id <TOKEN_CONTRACT_ID> \
  --network testnet \
  --source <your-key> \
  -- initialize \
  --admin <your-address> \
  --decimal 7 \
  --name "SAVE TOKEN" \
  --symbol "SAV"

# Rewards initialization
stellar contract invoke \
  --id <REWARDS_CONTRACT_ID> \
  --network testnet \
  --source <your-key> \
  -- initialize \
  --token_contract_id <TOKEN_CONTRACT_ID> \
  --savings_contract_id <SAVINGS_CONTRACT_ID>

# Savings initialization
stellar contract invoke \
  --id <SAVINGS_CONTRACT_ID> \
  --network testnet \
  --source <your-key> \
  -- initialize \
  --token_contract_id <TOKEN_CONTRACT_ID> \
  --reward_contract_id <REWARDS_CONTRACT_ID>
```

### 4. Deploy Frontend to Vercel

```bash
cd frontend
vercel env pull # Pull environment variables
vercel deploy --prod
```

**Required environment variables:**
```
VITE_TOKEN_CONTRACT_ID=<your-token-contract-id>
VITE_SAVINGS_CONTRACT_ID=<your-savings-contract-id>
VITE_REWARDS_CONTRACT_ID=<your-rewards-contract-id>
VITE_RPC_URL=https://soroban-testnet.stellar.org
```

## Testing

### Unit Tests

```bash
# Test all contracts
cd contracts
cargo test

# Test specific contract
cargo test -p soroban-savings
```

### CI/CD Pipeline

Automated testing and deployment on push to `main`:
- Contracts build + test
- Frontend build
- Automatic Vercel deployment

**GitHub Secrets Required:**
- `VERCEL_TOKEN`: Vercel API token
- `VERCEL_ORG_ID`: Organization ID
- `VERCEL_PROJECT_ID`: Project ID

## Mobile Responsive

The frontend is fully mobile responsive with Tailwind CSS and adapts to:
- Mobile (374px - 640px)
- Tablet (641px - 1024px)
- Desktop (1025px+)

## Production Checklist

- [x] Inter-contract calls working (SavingsContract → RewardsContract → SaveToken)
- [x] Custom token deployed (SaveToken with 7 decimals)
- [x] CI/CD pipeline running (GitHub Actions + Vercel)
- [x] Mobile responsive UI
- [x] 15+ meaningful commits
- [x] Production-ready contracts (tested, validated)

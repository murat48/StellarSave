#!/usr/bin/env bash
# StellarSave Mainnet Resume Script
# Token ve Savings zaten deploy edildi. Bu script sadece Rewards deploy eder ve
# tüm kontratları initialize eder.
#
# Usage:
#   export STELLAR_SECRET=S...
#   ./scripts/deploy-mainnet-resume.sh

set -e

NETWORK="mainnet"
HORIZON_URL="https://horizon.stellar.org"
RPC_URL="https://mainnet.sorobanrpc.com"
NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
SECRET_KEY="${STELLAR_SECRET:?STELLAR_SECRET env var required}"

# Daha önce deploy edilen kontratlar
TOKEN_ID="CA7YIXT3JPVX4CRVKGHIMUC5QLVZFNUMQHLLE3Y7LYGAKJTDBHVTXCXI"
SAVINGS_ID="CCQANGP6ZJ2AK6BFURFYVSKQEXARE3MWVUCGSCQAVCMKMAB7G4S7A4QM"

CONTRACTS_DIR="$(dirname "$0")/../contracts"
ENV_FILE="$(dirname "$0")/../frontend/.env"

ADMIN_ADDRESS=$(stellar keys address "$SECRET_KEY")

echo "==> Deploying Rewards contract..."
REWARDS_ID=$(stellar contract deploy \
  --wasm "$CONTRACTS_DIR/target/wasm32v1-none/release/soroban_rewards.wasm" \
  --source "$SECRET_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  --inclusion-fee 1000000)
echo "Rewards Contract ID: $REWARDS_ID"

echo ""
echo "==> Initializing Token contract..."
stellar contract invoke \
  --id "$TOKEN_ID" \
  --source "$SECRET_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  --inclusion-fee 1000000 \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --decimal 7 \
  --name "SaveToken" \
  --symbol "SAVE"

echo ""
echo "==> Initializing Savings contract..."
stellar contract invoke \
  --id "$SAVINGS_ID" \
  --source "$SECRET_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  --inclusion-fee 1000000 \
  -- initialize \
  --token_contract_id "$TOKEN_ID" \
  --reward_contract_id "$REWARDS_ID"

echo ""
echo "==> Initializing Rewards contract..."
stellar contract invoke \
  --id "$REWARDS_ID" \
  --source "$SECRET_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  --inclusion-fee 1000000 \
  -- initialize \
  --token_contract_id "$TOKEN_ID" \
  --savings_contract_id "$SAVINGS_ID"

echo ""
echo "==> Writing frontend/.env for mainnet..."
cat > "$ENV_FILE" << EOF
VITE_TOKEN_CONTRACT_ID=$TOKEN_ID
VITE_SAVINGS_CONTRACT_ID=$SAVINGS_ID
VITE_REWARDS_CONTRACT_ID=$REWARDS_ID
VITE_NETWORK=PUBLIC
VITE_HORIZON_URL=$HORIZON_URL
VITE_RPC_URL=$RPC_URL
EOF

echo ""
echo "✅ Mainnet deploy tamamlandı!"
echo ""
echo "Contract Adresleri:"
echo "  SAVE Token : $TOKEN_ID"
echo "  Savings    : $SAVINGS_ID"
echo "  Rewards    : $REWARDS_ID"
echo ""
echo "==> Frontend build alınıyor..."
cd "$(dirname "$0")/../frontend"
npm run build
echo ""
echo "✅ Frontend build hazır: frontend/dist/"

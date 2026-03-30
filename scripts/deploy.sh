#!/usr/bin/env bash
# StellarSave Contract Deploy Script
# Usage: ./scripts/deploy.sh
# Requires: stellar CLI installed + STELLAR_SECRET env var set

set -e

NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
SECRET_KEY="${STELLAR_SECRET:?STELLAR_SECRET env var required}"

CONTRACTS_DIR="$(dirname "$0")/../contracts"
ENV_FILE="$(dirname "$0")/../frontend/.env"

echo "==> Building all contracts..."
cd "$CONTRACTS_DIR"
stellar contract build

echo ""
echo "==> Deploying Token contract..."
TOKEN_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/soroban_save_token.wasm \
  --source "$SECRET_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")
echo "Token Contract ID: $TOKEN_ID"

echo ""
echo "==> Deploying Savings contract..."
SAVINGS_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/soroban_savings.wasm \
  --source "$SECRET_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")
echo "Savings Contract ID: $SAVINGS_ID"

echo ""
echo "==> Deploying Rewards contract..."
REWARDS_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/soroban_rewards.wasm \
  --source "$SECRET_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")
echo "Rewards Contract ID: $REWARDS_ID"

echo ""
echo "==> Initializing Token contract..."
stellar contract invoke \
  --id "$TOKEN_ID" \
  --source "$SECRET_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- initialize \
  --admin "$(stellar keys address "$SECRET_KEY")" \
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
  -- initialize \
  --token_contract_id "$TOKEN_ID" \
  --savings_contract_id "$SAVINGS_ID"

echo ""
echo "==> Writing frontend/.env..."
cat > "$ENV_FILE" << EOF
VITE_TOKEN_CONTRACT_ID=$TOKEN_ID
VITE_SAVINGS_CONTRACT_ID=$SAVINGS_ID
VITE_REWARDS_CONTRACT_ID=$REWARDS_ID
VITE_NETWORK=TESTNET
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_RPC_URL=https://soroban-testnet.stellar.org
EOF

echo ""
echo "✅ All contracts deployed and initialized!"
echo ""
echo "Contract Addresses:"
echo "  SAVE Token : $TOKEN_ID"
echo "  Savings    : $SAVINGS_ID"
echo "  Rewards    : $REWARDS_ID"

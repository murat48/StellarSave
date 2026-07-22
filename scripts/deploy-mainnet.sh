#!/usr/bin/env bash
# StellarSave Mainnet Deploy Script
# Usage:
#   export STELLAR_SECRET=S...  (kendi terminalinde yaz, bana gönderme!)
#   ./scripts/deploy-mainnet.sh

set -e

NETWORK="mainnet"
HORIZON_URL="https://horizon.stellar.org"
RPC_URL="https://mainnet.sorobanrpc.com"
NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
SECRET_KEY="${STELLAR_SECRET:?STELLAR_SECRET env var required}"

CONTRACTS_DIR="$(dirname "$0")/../contracts"
ENV_FILE="$(dirname "$0")/../frontend/.env"

echo "==> Building all contracts (release + optimize)..."
cd "$CONTRACTS_DIR"
stellar contract build --optimize

echo ""
echo "==> Deploying Token contract..."
TOKEN_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/soroban_save_token.wasm \
  --source "$SECRET_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  --inclusion-fee 1000000)
echo "Token Contract ID: $TOKEN_ID"

echo ""
echo "==> Deploying Savings contract..."
SAVINGS_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/soroban_savings.wasm \
  --source "$SECRET_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  --inclusion-fee 1000000)
echo "Savings Contract ID: $SAVINGS_ID"

echo ""
echo "==> Deploying Rewards contract..."
REWARDS_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/soroban_rewards.wasm \
  --source "$SECRET_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  --inclusion-fee 1000000)
echo "Rewards Contract ID: $REWARDS_ID"

ADMIN_ADDRESS=$(stellar keys address "$SECRET_KEY")

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

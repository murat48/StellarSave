#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

// Note: Full integration tests require a running testnet or a mock environment
// with the token and rewards contracts deployed. These are unit-level smoke tests.

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);

    let token_addr = Address::generate(&env);
    let reward_addr = Address::generate(&env);

    client.initialize(&token_addr, &reward_addr);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SavingsContract, ());
    let client = SavingsContractClient::new(&env, &contract_id);

    let token_addr = Address::generate(&env);
    let reward_addr = Address::generate(&env);

    client.initialize(&token_addr, &reward_addr);
    client.initialize(&token_addr, &reward_addr);
}

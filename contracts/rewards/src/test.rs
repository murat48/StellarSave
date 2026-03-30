#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(RewardsContract, ());
    let client = RewardsContractClient::new(&env, &contract_id);

    let token_addr = Address::generate(&env);
    let savings_addr = Address::generate(&env);

    client.initialize(&token_addr, &savings_addr);
    assert_eq!(client.get_apy(), 5u32);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_double_initialize() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(RewardsContract, ());
    let client = RewardsContractClient::new(&env, &contract_id);

    let token_addr = Address::generate(&env);
    let savings_addr = Address::generate(&env);

    client.initialize(&token_addr, &savings_addr);
    client.initialize(&token_addr, &savings_addr);
}

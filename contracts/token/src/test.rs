#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_initialize_and_mint() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveToken, ());
    let client = SaveTokenClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(
        &admin,
        &7u32,
        &String::from_str(&env, "SaveToken"),
        &String::from_str(&env, "SAVE"),
    );

    client.mint(&user, &10_000_000i128);
    assert_eq!(client.balance(&user), 10_000_000i128);
}

#[test]
fn test_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveToken, ());
    let client = SaveTokenClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.initialize(
        &admin,
        &7u32,
        &String::from_str(&env, "SaveToken"),
        &String::from_str(&env, "SAVE"),
    );

    client.mint(&alice, &100_000_000i128);
    client.transfer(&alice, &bob, &30_000_000i128);

    assert_eq!(client.balance(&alice), 70_000_000i128);
    assert_eq!(client.balance(&bob), 30_000_000i128);
}

#[test]
fn test_approve_and_transfer_from() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SaveToken, ());
    let client = SaveTokenClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let spender = Address::generate(&env);
    let bob = Address::generate(&env);

    client.initialize(
        &admin,
        &7u32,
        &String::from_str(&env, "SaveToken"),
        &String::from_str(&env, "SAVE"),
    );

    client.mint(&alice, &100_000_000i128);
    client.approve(&alice, &spender, &50_000_000i128, &1000u32);
    client.transfer_from(&spender, &alice, &bob, &50_000_000i128);

    assert_eq!(client.balance(&alice), 50_000_000i128);
    assert_eq!(client.balance(&bob), 50_000_000i128);
}

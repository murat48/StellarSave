#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Decimal,
    Name,
    Symbol,
    Balance(Address),
    Allowance(Address, Address),
    AllowanceExpiry(Address, Address),
}

fn get_balance(env: &Env, addr: &Address) -> i128 {
    env.storage()
        .persistent()
        .get::<DataKey, i128>(&DataKey::Balance(addr.clone()))
        .unwrap_or(0)
}

fn set_balance(env: &Env, addr: &Address, amount: i128) {
    env.storage()
        .persistent()
        .set(&DataKey::Balance(addr.clone()), &amount);
}

#[contract]
pub struct SaveToken;

#[contractimpl]
impl SaveToken {
    pub fn initialize(env: Env, admin: Address, decimal: u32, name: String, symbol: String) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Decimal, &decimal);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        assert!(amount > 0, "amount must be positive");
        let balance = get_balance(&env, &to);
        set_balance(&env, &to, balance + amount);
        env.events()
            .publish((symbol_short!("mint"), to), amount);
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        get_balance(&env, &id)
    }

    pub fn decimals(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Decimal).unwrap()
    }

    pub fn name(env: Env) -> String {
        env.storage().instance().get(&DataKey::Name).unwrap()
    }

    pub fn symbol(env: Env) -> String {
        env.storage().instance().get(&DataKey::Symbol).unwrap()
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        assert!(amount > 0, "amount must be positive");
        let from_balance = get_balance(&env, &from);
        assert!(from_balance >= amount, "insufficient balance");
        set_balance(&env, &from, from_balance - amount);
        let to_balance = get_balance(&env, &to);
        set_balance(&env, &to, to_balance + amount);
        env.events()
            .publish((symbol_short!("transfer"), from, to), amount);
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();
        env.storage().persistent().set(&DataKey::Allowance(from.clone(), spender.clone()), &amount);
        env.storage().persistent().set(&DataKey::AllowanceExpiry(from.clone(), spender.clone()), &expiration_ledger);
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let expiry: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::AllowanceExpiry(from.clone(), spender.clone()))
            .unwrap_or(0);
        if env.ledger().sequence() > expiry {
            return 0;
        }
        env.storage()
            .persistent()
            .get::<DataKey, i128>(&DataKey::Allowance(from, spender))
            .unwrap_or(0)
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        assert!(amount > 0, "amount must be positive");

        let expiry: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::AllowanceExpiry(from.clone(), spender.clone()))
            .unwrap_or(0);
        assert!(env.ledger().sequence() <= expiry, "allowance expired");

        let allowed: i128 = env
            .storage()
            .persistent()
            .get::<DataKey, i128>(&DataKey::Allowance(from.clone(), spender.clone()))
            .unwrap_or(0);
        assert!(allowed >= amount, "allowance exceeded");

        env.storage()
            .persistent()
            .set(&DataKey::Allowance(from.clone(), spender.clone()), &(allowed - amount));

        let from_balance = get_balance(&env, &from);
        assert!(from_balance >= amount, "insufficient balance");
        set_balance(&env, &from, from_balance - amount);
        let to_balance = get_balance(&env, &to);
        set_balance(&env, &to, to_balance + amount);

        env.events()
            .publish((symbol_short!("xfer_from"), spender, from, to), amount);
    }

    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }
}

mod test;

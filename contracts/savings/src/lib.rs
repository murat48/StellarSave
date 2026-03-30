#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env,
};

mod token_interface {
    use soroban_sdk::{contractclient, Address, Env};

    #[contractclient(name = "TokenClient")]
    pub trait Token {
        fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128);
        fn transfer(env: Env, from: Address, to: Address, amount: i128);
    }
}

mod rewards_interface {
    use soroban_sdk::{contractclient, Address, Env};

    #[contractclient(name = "RewardsClient")]
    pub trait Rewards {
        fn calculate_and_pay(env: Env, user: Address, principal: i128, duration_ledgers: u32);
    }
}

#[contracttype]
#[derive(Clone)]
pub struct SavingsRecord {
    pub amount: i128,
    pub start_ledger: u32,
    pub lock_period: u32,
    pub is_active: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    TokenContract,
    RewardContract,
    Savings(Address),
}

#[contract]
pub struct SavingsContract;

#[contractimpl]
impl SavingsContract {
    pub fn initialize(env: Env, token_contract_id: Address, reward_contract_id: Address) {
        if env.storage().instance().has(&DataKey::TokenContract) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::TokenContract, &token_contract_id);
        env.storage().instance().set(&DataKey::RewardContract, &reward_contract_id);
    }

    pub fn deposit(env: Env, user: Address, amount: i128, lock_period_in_ledgers: u32) {
        user.require_auth();
        assert!(amount > 0, "amount must be positive");
        assert!(lock_period_in_ledgers > 0, "lock period must be positive");

        let savings_key = DataKey::Savings(user.clone());
        let existing: Option<SavingsRecord> = env.storage().persistent().get(&savings_key);
        if let Some(record) = existing {
            assert!(!record.is_active, "active savings already exist");
        }

        let token_id: Address = env.storage().instance().get(&DataKey::TokenContract).unwrap();
        let contract_address = env.current_contract_address();

        let token_client = token_interface::TokenClient::new(&env, &token_id);
        token_client.transfer_from(&user, &user, &contract_address, &amount);

        let record = SavingsRecord {
            amount,
            start_ledger: env.ledger().sequence(),
            lock_period: lock_period_in_ledgers,
            is_active: true,
        };
        env.storage().persistent().set(&savings_key, &record);
    }

    pub fn withdraw(env: Env, user: Address) {
        user.require_auth();

        let savings_key = DataKey::Savings(user.clone());
        let record: SavingsRecord = env
            .storage()
            .persistent()
            .get(&savings_key)
            .expect("no savings found");

        assert!(record.is_active, "no active savings");

        let current_ledger = env.ledger().sequence();
        let unlock_ledger = record.start_ledger + record.lock_period;
        assert!(current_ledger >= unlock_ledger, "savings still locked");

        let token_id: Address = env.storage().instance().get(&DataKey::TokenContract).unwrap();
        let reward_id: Address = env.storage().instance().get(&DataKey::RewardContract).unwrap();
        let contract_address = env.current_contract_address();

        let token_client = token_interface::TokenClient::new(&env, &token_id);
        token_client.transfer(&contract_address, &user, &record.amount);

        let duration = current_ledger - record.start_ledger;
        let rewards_client = rewards_interface::RewardsClient::new(&env, &reward_id);
        rewards_client.calculate_and_pay(&user, &record.amount, &duration);

        let updated = SavingsRecord {
            is_active: false,
            ..record
        };
        env.storage().persistent().set(&savings_key, &updated);
    }

    pub fn get_savings(env: Env, user: Address) -> Option<SavingsRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Savings(user))
    }

    pub fn get_time_remaining(env: Env, user: Address) -> u32 {
        let record: SavingsRecord = env
            .storage()
            .persistent()
            .get(&DataKey::Savings(user))
            .expect("no savings found");

        if !record.is_active {
            return 0;
        }

        let current = env.ledger().sequence();
        let unlock = record.start_ledger + record.lock_period;
        if current >= unlock {
            0
        } else {
            unlock - current
        }
    }
}

mod test;

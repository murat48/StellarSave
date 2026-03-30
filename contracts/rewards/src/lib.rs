#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env,
};

mod token_interface {
    use soroban_sdk::{contractclient, Address, Env};

    #[contractclient(name = "TokenClient")]
    pub trait Token {
        fn mint(env: Env, to: Address, amount: i128);
    }
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    TokenContract,
    SavingsContract,
}

#[contract]
pub struct RewardsContract;

#[contractimpl]
impl RewardsContract {
    pub fn initialize(env: Env, token_contract_id: Address, savings_contract_id: Address) {
        if env.storage().instance().has(&DataKey::TokenContract) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::TokenContract, &token_contract_id);
        env.storage().instance().set(&DataKey::SavingsContract, &savings_contract_id);
    }

    /// Called only by the savings contract.
    /// reward = principal * 5% * (duration / 100_000)
    pub fn calculate_and_pay(env: Env, user: Address, principal: i128, duration_ledgers: u32) {
        let savings_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::SavingsContract)
            .unwrap();
        savings_contract.require_auth();

        let duration = duration_ledgers as i128;
        // 5 basis points per 100_000 ledgers (≈ 5% APY)
        let reward = principal * 5 * duration / (100 * 100_000);

        if reward > 0 {
            let token_id: Address = env.storage().instance().get(&DataKey::TokenContract).unwrap();
            let token_client = token_interface::TokenClient::new(&env, &token_id);
            token_client.mint(&user, &reward);
        }
    }

    pub fn get_apy(_env: Env) -> u32 {
        5
    }
}

mod test;

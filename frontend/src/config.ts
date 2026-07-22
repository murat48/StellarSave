import { Networks } from "@stellar/stellar-sdk";

export const IS_MAINNET = import.meta.env.VITE_NETWORK === "PUBLIC";

export const NETWORK_PASSPHRASE = IS_MAINNET
  ? Networks.PUBLIC
  : Networks.TESTNET;

export const NETWORK_LABEL = IS_MAINNET ? "Mainnet" : "Testnet";

import React, { createContext, useCallback, useContext, useState } from "react";
import {
  StellarWalletsKit,
  Networks,
  defaultModules,
  FREIGHTER_ID,
} from "@creit.tech/stellar-wallets-kit";

// Initialize once — all methods are static in the new API
StellarWalletsKit.init({
  network: Networks.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: defaultModules(),
});

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (xdr: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [address, setAddress] = useState<string | null>(null);

  const connect = useCallback(async () => {
    const { address: addr } = await StellarWalletsKit.authModal();
    setAddress(addr);
  }, []);

  const disconnect = useCallback(async () => {
    await StellarWalletsKit.disconnect();
    setAddress(null);
  }, []);

  const signTransaction = useCallback(async (xdr: string): Promise<string> => {
    const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
      networkPassphrase: Networks.TESTNET,
    });
    return signedTxXdr;
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        connect,
        disconnect,
        signTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};

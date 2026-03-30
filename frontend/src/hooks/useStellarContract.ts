import { useCallback } from "react";
import { SorobanRpc, TransactionBuilder, Networks, BASE_FEE, xdr, scValToNative } from "@stellar/stellar-sdk";
import { useWallet } from "../contexts/WalletContext";

const RPC_URL = import.meta.env.VITE_RPC_URL as string;
const NETWORK_PASSPHRASE = Networks.TESTNET;

const server = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

export function useStellarContract() {
  const { address, signTransaction } = useWallet();

  const invokeContract = useCallback(
    async (contractId: string, method: string, args: xdr.ScVal[] = []): Promise<unknown> => {
      if (!address) throw new Error("Wallet not connected");

      const account = await server.getAccount(address);

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          // @ts-expect-error dynamic contract call
          new (await import("@stellar/stellar-sdk")).Contract(contractId).call(method, ...args)
        )
        .setTimeout(30)
        .build();

      const preparedTx = await server.prepareTransaction(tx);
      const signedXdr = await signTransaction(preparedTx.toXDR());

      const submittedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const response = await server.sendTransaction(submittedTx);

      if (response.status === "ERROR") {
        throw new Error(`Transaction failed: ${JSON.stringify(response.errorResult)}`);
      }

      // Poll for result
      let result = await server.getTransaction(response.hash);
      while (result.status === "NOT_FOUND") {
        await new Promise((r) => setTimeout(r, 1000));
        result = await server.getTransaction(response.hash);
      }

      if (result.status === "SUCCESS" && result.returnValue) {
        return scValToNative(result.returnValue);
      }

      throw new Error(`Transaction failed with status: ${result.status}`);
    },
    [address, signTransaction]
  );

  const readContract = useCallback(
    async (contractId: string, method: string, args: xdr.ScVal[] = []): Promise<unknown> => {
      const { Contract, nativeToScVal } = await import("@stellar/stellar-sdk");
      const contract = new Contract(contractId);
      const tx = new TransactionBuilder(
        await server.getAccount(address ?? "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN"),
        { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE }
      )
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build();

      const simResult = await server.simulateTransaction(tx);
      if (SorobanRpc.Api.isSimulationError(simResult)) {
        throw new Error(simResult.error);
      }

      const retVal = (simResult as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval;
      return retVal ? scValToNative(retVal) : null;
    },
    [address]
  );

  return { invokeContract, readContract };
}

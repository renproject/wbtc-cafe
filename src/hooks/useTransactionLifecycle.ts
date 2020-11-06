import RenJS from "@renproject/ren";
import { useCallback } from "react";
import * as Sentry from "@sentry/react";
import { AbiItem } from "web3-utils";
import { FeeStore } from "../store/feeStore";
import { Store } from "../store/store";
import { Transaction } from "../types/transaction";
import adapterABI from "../utils/ABIs/adapterCurveABI.json";
import { Asset } from "../utils/assets";
import Web3 from "web3";
import { Transaction as EthTransaction } from "web3-core";

export enum TransactionEventType {
  // Transaction loaded from persistence, and needs to have lifecyle action determined
  RESTORED = "restored",
  // User has provided parameters to create a transaction which has been persisted
  CREATED = "created",
  // Gateway address generated, but no deposit yet detected
  INITIALIZED = "initialized",
  // UTXO / txhash is detected in a deposit event
  DETECTED = "detected",
  // RenVM detects a deposit confirmation from the source chain, utxo is present
  DEPOSITED = "deposited",
  // Source chain has posted all neccessary confirmations
  CONFIRMED = "confirmed",
  // Submitted to RenVM & signature returned
  ACCEPTED = "accepted",
  // Destination network contract interaction has been submitted
  CLAIMED = "claimed",
  // Destination network transaction has been confirmed
  COMPLETED = "completed",
  // Destination chain reverted the transaction (likely due to gas)
  REVERTED = "reverted",
  // An error occured while processing
  ERROR = "error",
}

export interface TransactionEvent {
  type: TransactionEventType;
  tx: Transaction;
}

export interface MintingContext {
  sdk: RenJS;
  adapterAddress: string;
  localWeb3Address: string;
  convertAdapterAddress: string;
}

export interface TransactionLifecycleMethods {
  completeConvertToEthereum: (
    transaction: Transaction,
    approveSwappedAsset?: string
  ) => Promise<void>;
  initConvertToEthereum: (tx: Transaction) => Promise<void>;
  // initConvertFromEthereum: (tx: Transaction) => Promise<void>;
}

type TransactionDispatch = (txEvent: TransactionEvent) => void;

export function useTransactionLifecycle(
  addTx: (x: Transaction) => void,
  getTx: (x: string) => Transaction | null,
  updateTx: (x: Transaction) => Transaction,
  txExists: (x: Transaction) => boolean
): TransactionLifecycleMethods {
  const {
    localWeb3Address,
    localWeb3,

    setSwapRevertModalTx,
    setSwapRevertModalExchangeRate,
    setShowSwapRevertModal,
  } = Store.useContainer();

  const { getFinalDepositExchangeRate } = FeeStore.useContainer();

  // Check confirmation status of ethereum minting transaction
  const checkMintingTx = useCallback(
    async (tx: Transaction) => {
      if (!localWeb3 || !tx.destTxHash) {
        return;
      }

      // Get transaction details
      const txDetails = await localWeb3.eth.getTransaction(tx.destTxHash);
      if (txDetails) {
        // Update confs
        const confs = await getEthConfs(localWeb3.eth, txDetails);
        if (confs > 0) {
          const receipt = await localWeb3.eth.getTransactionReceipt(
            tx.destTxHash
          );

          // reverted because gas ran out
          if (
            (receipt && ((receipt.status as unknown) as string) === "0x0") ||
            receipt.status === false
          ) {
            // addEvent "reverted"
            Sentry.withScope(function (scope) {
              scope.setTag("error-hint", "transaction reverted");
              Sentry.captureException(new Error("No reciept status"));
            });
            updateTx({ ...tx, error: true, destTxHash: "" });
          } else {
            updateTx({
              ...tx,
              destTxConfs: confs,
              awaiting: "",
              error: false,
            });
          }
        }
      } else {
        updateTx({ ...tx, error: true });
      }
    },
    [updateTx, localWeb3]
  );

  // // Given a transaction, check its current ethereum confirmation status
  // // and submit to renVM if ready
  // const checkBurningTx = useCallback(
  //   async (tx) => {
  //     const web3 = localWeb3;
  //     if (!web3 || !sdk) return;
  //     const targetConfs = tx.sourceNetworkVersion === "testnet" ? 13 : 30;
  //     // Get latest tx state every iteration
  //     let latestTx = getTx(tx.id) || tx;
  //     // tx update might not be persisted yet
  //     if (!latestTx.sourceTxHash) {
  //       latestTx = tx;
  //     }
  //     if (!latestTx.sourceTxHash) {
  //       console.error("Missing ethereum tx!");
  //       return;
  //     }

  //     // Get transaction details
  //     const txDetails = await web3.eth.getTransaction(latestTx.sourceTxHash);
  //     const confs = await getEthConfs(web3.eth, txDetails);

  //     // Update confs
  //     if (confs !== latestTx.sourceTxConfs) {
  //       updateTx({ ...latestTx, sourceTxConfs: confs });
  //     }

  //     // After enough confs, start watching RenVM
  //     if ((latestTx.sourceTxConfs ?? 0) >= targetConfs) {
  //       if (latestTx.awaiting === "eth-settle") {
  //         updateTx({ ...latestTx, awaiting: "ren-settle" });
  //       }

  //       try {
  //         const burn = await sdk
  //           .burnAndRelease({
  //             sendToken: RenJS.Tokens.BTC.Eth2Btc,
  //             web3Provider: web3.currentProvider,
  //             ethereumTxHash: tx.sourceTxHash,
  //           })
  //           .readFromEthereum();
  //         const renVMTx = await burn.queryTx();
  //         if (renVMTx.txStatus === "done") {
  //           updateTx({
  //             ...latestTx,
  //             awaiting: "",
  //             error: false,
  //           });
  //         }
  //       } catch (e) {
  //         console.error(e);
  //       }
  //     }
  //   },
  //   [sdk, localWeb3, updateTx, addTxEvent, getTx]
  // );

  // Called to check if the tx is aproved for current exchange rate,
  // and then submits to ethereum
  const completeConvertToEthereum = useCallback(
    async (transaction: Transaction, approveSwappedAsset?: string) => {
      if (!localWeb3) {
        return;
      }
      const renResponse = transaction.renResponse;

      // amount user sent
      const userBtcTxAmount = Number(
        (renResponse.in.utxo.amount / 10 ** 8).toFixed(8)
      );
      // amount in renvm after fixed fee
      const utxoAmountSats = renResponse.out.amount;

      // update amount to the actual amount sent
      const tx = updateTx({ ...transaction, sourceAmount: userBtcTxAmount });

      const { renSignature, minExchangeRate } = tx;
      // if swap will revert to renBTC, let the user know before proceeding
      const exchangeRate = await getFinalDepositExchangeRate(tx);
      if (!exchangeRate || !minExchangeRate) {
        throw Error("missing exchange rates");
      }
      updateTx({ ...tx, exchangeRateOnSubmit: exchangeRate });
      if (!approveSwappedAsset && exchangeRate < minExchangeRate) {
        Sentry.withScope(function (scope) {
          scope.setTag("error-hint", "exchange rate changed");
          Sentry.captureMessage("Exchange rate below minimum");
        });
        setSwapRevertModalTx(tx.id);
        setSwapRevertModalExchangeRate(exchangeRate.toFixed(8));
        setShowSwapRevertModal(true);
        updateTx({ ...tx, awaiting: "eth-init" });
        return;
      }

      let newMinExchangeRate = minExchangeRate;
      if (approveSwappedAsset === Asset.WBTC) {
        const rateMinusOne = exchangeRate - 1;
        newMinExchangeRate = rateMinusOne.toFixed(0);
      }

      // const adapterContract = new localWeb3.eth.Contract(
      //   adapterABI as AbiItem[],
      //   tx.adapterAddress
      // );

      try {
        // const contractCall = adapterContract.methods.mintThenSwap(
        //   params.contractCalls[0].contractParams[0].value,
        //   newMinExchangeRate,
        //   params.contractCalls[0].contractParams[1].value,
        //   params.contractCalls[0].contractParams[2].value,
        //   utxoAmountSats,
        //   renResponse.out.nhash,
        //   renSignature
        // );
        // const gasParams = (localWeb3.currentProvider as any)?.isWalletConnect
        //   ? await getGasParams(localWeb3, contractCall, localWeb3Address)
        //   : {};
      } catch (e) {
        Sentry.withScope(function (scope) {
          scope.setTag("error-hint", "error submitting mint");
          Sentry.captureException(e);
        });
        console.error(e);
        updateTx({ ...tx, error: true });
      }
    },
    [
      getFinalDepositExchangeRate,
      localWeb3,
      localWeb3Address,
      setShowSwapRevertModal,
      setSwapRevertModalExchangeRate,
      setSwapRevertModalTx,
      updateTx,
    ]
  );

  // const initConvertFromEthereum = useCallback(
  //   async function (tx: Transaction) {
  //     if (!localWeb3) return;
  //     const { amount, adapterAddress, destAddress, minSwapProceeds } = tx;

  //     const adapter = new localWeb3.eth.Contract(
  //       adapterABI as AbiItem[],
  //       adapterAddress
  //     );

  //     if (!txExists(tx)) {
  //       addTx(tx);
  //     } else if (tx.error) {
  //       // clear error when re-attempting
  //       updateTx({ ...tx, error: false });
  //     }

  //     try {
  //       const contractCall = swapThenBurn(
  //         adapter,
  //         destAddress,
  //         amount,
  //         minSwapProceeds
  //       );

  //       const gasParams = (localWeb3.currentProvider as any)?.isWalletConnect
  //         ? await getGasParams(localWeb3, contractCall, localWeb3Address)
  //         : {};

  //       await contractCall
  //         .send({ from: localWeb3Address, ...gasParams })
  //         .on("transactionHash", (hash: string) => {
  //           const newTx = {
  //             ...tx,
  //             awaiting: "eth-settle",
  //             sourceTxHash: hash,
  //             error: false,
  //           };
  //         });
  //     } catch (e) {
  //       console.error("eth burn error", e);
  //       Sentry.withScope(function (scope) {
  //         scope.setTag("error-hint", "error submitting burn");
  //         Sentry.captureException(e);
  //       });
  //       console.error(e);
  //       return;
  //     }
  //   },
  //   [updateTx, txExists, localWeb3, localWeb3Address, addTx]
  // );

  // restore transactions on app-load

  const initConvertToEthereum = useCallback(
    async (tx: Transaction) => {
      addTx(tx);
    },
    [addTx]
  );

  return {
    completeConvertToEthereum,
    initConvertToEthereum,
    // initConvertFromEthereum,
  };
}

const getTargetConfs = (
  tx: Transaction,
  network: "ethereum" | "bitcoin"
): number => {
  switch (network) {
    case "ethereum":
      return tx.sourceNetworkVersion === "testnet" ? 13 : 30;
    case "bitcoin":
      return tx.sourceNetworkVersion === "testnet" ? 2 : 6;
  }
};

// const swapThenBurn = (
//   adapter: any,
//   to: string,
//   amount: string | number,
//   minSwapProceeds: number
// ) =>
//   adapter.methods.swapThenBurn(
//     RenJS.utils.BTC.addressToHex(to), //_to
//     RenJS.utils.value(amount, Asset.BTC).sats().toNumber().toFixed(0), // _amount in Satoshis
//     RenJS.utils.value(minSwapProceeds, Asset.BTC).sats().toNumber().toFixed(0)
//   );

const getEthConfs = async (
  eth: Web3["eth"],
  txDetails: EthTransaction
): Promise<number> => {
  const currentBlock = await eth.getBlockNumber();
  return txDetails.blockNumber === null || txDetails.blockNumber > currentBlock
    ? 0
    : currentBlock - txDetails.blockNumber;
};

const getGasParams = async (web3: Web3, call: any, from: string) => {
  return {
    gas: (await call.estimateGas({ from })) + 1000,
    gasPrice: await web3.eth.getGasPrice(),
    nonce: await web3.eth.getTransactionCount(from),
  };
};

import { useState } from "react";
import RenJS from "@renproject/ren";
import Web3 from "web3";
import { createContainer } from "unstated-next";
import { List } from "immutable";

import { Transaction } from "../types/transaction";
import { Database } from "../utils/database/database";
import { ADAPTER_TEST } from "../utils/environmentVariables";
import BigNumber from "bignumber.js";
import { RenNetwork } from "@renproject/interfaces";

interface RenVMFees {
  lock?: BigNumber;
  release?: BigNumber;
  mint: number;
  burn: number;
}

require("dotenv").config();

const MockDB: Database<Transaction> = {
  addTx: async () => {},
  updateTx: async () => {},
  deleteTx: async () => {},
  getUser: async () => ({ uid: "mock" }),
  getTxs: async () => [],
};

const useStore = (database: Database<Transaction> | undefined) => {
  const [db, setDb] = useState(MockDB); //database || newDefaultDatabase<Transaction>());

  // networking
  const [wbtcAddress, setWbtcAddress] = useState("");
  const [adapterAddress, setAdapterAddress] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<RenNetwork>(
    RenNetwork.Testnet
  );

  // wallet & web3
  const [dataWeb3, setDataWeb3] = useState(null as Web3 | null);
  const [localWeb3, setLocalWeb3] = useState(null as Web3 | null);
  const [localWeb3Address, setLocalWeb3Address] = useState("");
  const [walletConnectError, setWalletConnectError] = useState(false);
  const [wbtcBalance, setWbtcBalance] = useState(0 as number | string);
  const [sdk, setSdk] = useState(null as RenJS | null);
  const [fees, setFees] = useState(null as RenVMFees | null);
  const [fsUser, setFsUser] = useState(
    null as {
      uid: string;
    } | null
  );

  const [fsSignature, setFsSignature] = useState(null as string | null);
  const [fsEnabled, setFsEnabled] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);

  // modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositModalTx, setDepositModalTx] = useState(
    null as Transaction | null
  );
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelModalTx, setCancelModalTx] = useState(null as string | null);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [gatewayModalTx, setGatewayModalTx] = useState<Transaction>();
  const [showSwapRevertModal, setShowSwapRevertModal] = useState(false);
  const [swapRevertModalTx, setSwapRevertModalTx] = useState(
    null as string | null
  );
  const [
    swapRevertModalExchangeRate,
    setSwapRevertModalExchangeRate,
  ] = useState("");
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  // conversions
  const [convertAdapterAddress, setConvertAdapterAddress] = useState(
    ADAPTER_TEST
  );
  const [
    convertAdapterWbtcAllowance,
    setConvertAdapterWbtcAllowance,
  ] = useState("");
  const [
    convertAdapterWbtcAllowanceRequesting,
    setConvertAdapterWbtcAllowanceRequesting,
  ] = useState(false);
  const [convertTransactions, setConvertTransactions] = useState(
    List<Transaction>()
  );
  const [
    convertPendingConvertToEthereum,
    setConvertPendingConvertToEthereum,
  ] = useState([] as string[]);
  const [convertSelectedDirection, setConvertSelectedDirection] = useState(0);
  const [convertAmount, setConvertAmount] = useState("" as string | number);
  const [convertDestination, setConvertDestination] = useState("");
  const [convertDestinationValid, setConvertDestinationValid] = useState(false);
  const [convertExchangeRate, setConvertExchangeRate] = useState(
    "" as "" | number
  );
  const [convertNetworkFee, setConvertNetworkFee] = useState("" as "" | number);
  const [convertRenVMFee, setConvertRenVMFee] = useState("" as "" | number);
  const [convertConversionTotal, setConvertConversionTotal] = useState(
    "" as string | number
  );
  const [convertMaxSlippage, setConvertMaxSlippage] = useState(0.01);

  // Large return value. This is only temporary until the store is broken up.

  return {
    wbtcAddress,
    setWbtcAddress,
    adapterAddress,
    setAdapterAddress,
    selectedNetwork,
    setSelectedNetwork,
    dataWeb3,
    setDataWeb3,
    localWeb3,
    setLocalWeb3,
    localWeb3Address,
    setLocalWeb3Address,
    walletConnectError,
    setWalletConnectError,
    wbtcBalance,
    setWbtcBalance,
    sdk,
    setSdk,
    fees,
    setFees,
    db,
    setDb,
    fsUser,
    setFsUser,
    fsSignature,
    setFsSignature,
    fsEnabled,
    setFsEnabled,
    loadingTransactions,
    setLoadingTransactions,
    disclosureAccepted,
    setDisclosureAccepted,
    showDepositModal,
    setShowDepositModal,
    depositModalTx,
    setDepositModalTx,
    showCancelModal,
    setShowCancelModal,
    cancelModalTx,
    setCancelModalTx,
    showGatewayModal,
    setShowGatewayModal,
    gatewayModalTx,
    setGatewayModalTx,
    showSwapRevertModal,
    setShowSwapRevertModal,
    swapRevertModalTx,
    setSwapRevertModalTx,
    swapRevertModalExchangeRate,
    setSwapRevertModalExchangeRate,
    showNetworkModal,
    setShowNetworkModal,
    convertAdapterAddress,
    setConvertAdapterAddress,
    convertAdapterWbtcAllowance,
    setConvertAdapterWbtcAllowance,
    convertAdapterWbtcAllowanceRequesting,
    setConvertAdapterWbtcAllowanceRequesting,
    convertTransactions,
    setConvertTransactions,
    convertPendingConvertToEthereum,
    setConvertPendingConvertToEthereum,
    convertSelectedDirection,
    setConvertSelectedDirection,
    convertAmount,
    setConvertAmount,
    convertDestination,
    setConvertDestination,
    convertDestinationValid,
    setConvertDestinationValid,
    convertExchangeRate,
    setConvertExchangeRate,
    convertNetworkFee,
    setConvertNetworkFee,
    convertRenVMFee,
    setConvertRenVMFee,
    convertConversionTotal,
    setConvertConversionTotal,
    convertMaxSlippage,
    setConvertMaxSlippage,
  };
};

export const Store = createContainer(useStore);

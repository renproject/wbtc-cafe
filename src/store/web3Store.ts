import RenSDK from "@renproject/ren";
import WalletConnectProvider from "@walletconnect/web3-provider";
import Web3 from "web3";
import { AbiItem } from "web3-utils";
import Web3Modal from "web3modal";
import { createContainer } from "unstated-next";
import { useCallback } from "react";
import { List } from "immutable";
import * as queryString from "query-string";

import { useTaskSchedule } from "../hooks/useTaskScheduler";
import { Transaction } from "../types/transaction";
import erc20ABI from "../utils/ABIs/erc20ABI.json";
import {
  ADAPTER_MAIN,
  ADAPTER_TEST,
  INFURA_KEY,
  WBTC_MAIN,
  WBTC_TEST,
} from "../utils/environmentVariables";
import { Store } from "./store";
import { TransactionStore } from "./transactionStore";
import { FeeStore } from "./feeStore";

function useWeb3() {
  const {
    localWeb3,
    localWeb3Address,
    wbtcAddress,
    selectedNetwork,
    db,
    disclosureAccepted,
    convertAdapterAddress,

    setWalletConnectError,
    setShowNetworkModal,
    setLocalWeb3,
    setLocalWeb3Address,
    setLoadingTransactions,
    setDisclosureAccepted,
    setFsSignature,
    setFsEnabled,
    setWbtcAddress,
    setSelectedNetwork,
    setSdk,
    setWbtcBalance,
    setDataWeb3,
    setFsUser,
    setConvertAdapterWbtcAllowanceRequesting,
    setConvertTransactions,
    setConvertAdapterAddress,
    setConvertAdapterWbtcAllowance,
  } = Store.useContainer();

  // const { initMonitoringTrigger } = TransactionStore.useContainer();

  const { gatherFeeData, updateRenVMFees } = FeeStore.useContainer();

  const updateAllowance = useCallback(async () => {
    const web3 = localWeb3;
    const walletAddress = localWeb3Address;
    const adapterAddress = convertAdapterAddress;

    if (!web3 || !walletAddress) {
      return;
    }

    const contract = new web3.eth.Contract(erc20ABI as AbiItem[], wbtcAddress);
    const allowance = await contract.methods
      .allowance(walletAddress, adapterAddress)
      .call();

    setConvertAdapterWbtcAllowance(
      Number(parseInt(allowance.toString()) / 10 ** 8).toFixed(8)
    );
  }, [
    convertAdapterAddress,
    localWeb3,
    localWeb3Address,
    setConvertAdapterWbtcAllowance,
    wbtcAddress,
  ]);

  const setWbtcAllowance = useCallback(async () => {
    const walletAddress = localWeb3Address;
    const web3 = localWeb3;
    const adapterAddress = convertAdapterAddress;

    const contract = new web3!.eth.Contract(erc20ABI as AbiItem[], wbtcAddress);
    setConvertAdapterWbtcAllowanceRequesting(true);
    try {
      await contract.methods
        .approve(adapterAddress, web3!.utils.toWei("1000000000000000000"))
        .send({
          from: walletAddress,
        });
      updateAllowance().catch(console.error);
      setConvertAdapterWbtcAllowanceRequesting(false);
    } catch (e) {
      console.error(e);
      setConvertAdapterWbtcAllowanceRequesting(false);
    }
  }, [
    convertAdapterAddress,
    localWeb3,
    localWeb3Address,
    setConvertAdapterWbtcAllowanceRequesting,
    updateAllowance,
    wbtcAddress,
  ]);

  const updateBalance = useCallback(async () => {
    const web3 = localWeb3;
    const walletAddress = localWeb3Address;

    if (!web3 || !walletAddress) {
      return;
    }

    const contract = new web3.eth.Contract(erc20ABI as AbiItem[], wbtcAddress);
    const balance = await contract.methods.balanceOf(walletAddress).call();

    setWbtcBalance(Number(parseInt(balance.toString()) / 10 ** 8).toFixed(8));
  }, [localWeb3, localWeb3Address, setWbtcBalance, wbtcAddress]);

  const watchWalletData = useCallback(async () => {
    try {
      await updateAllowance();
      await updateBalance();
    } catch (error) {
      console.error(error);
    }

    return 10; // run every 10 seconds
  }, [updateAllowance, updateBalance]);
  useTaskSchedule(watchWalletData, [localWeb3, localWeb3Address]);

  const initDataWeb3 = useCallback(
    async (network: string) => {
      const providedNetworkOrStore = network || selectedNetwork;
      setDataWeb3(
        new Web3(
          `https://${
            providedNetworkOrStore === "testnet" ? "kovan" : "mainnet"
          }.infura.io/v3/${INFURA_KEY}`
        )
      );
    },
    [selectedNetwork, setDataWeb3]
  );

  const getSignatures = useCallback(async (address: string, web3: Web3) => {
    const localSigMap = JSON.parse(localStorage.getItem("sigMap") || "{}");
    const localRawSigMap = JSON.parse(
      localStorage.getItem("rawSigMap") || "{}"
    );
    const addressLowerCase = address.toLowerCase();

    let signature: string | null = localSigMap[addressLowerCase];
    let rawSignature: string | null = localRawSigMap[addressLowerCase];

    if (!signature || !rawSignature) {
      // get unique wallet signature for database backup
      rawSignature = await web3.eth.personal.sign(
        web3.utils.utf8ToHex("Signing in to WBTC Cafe"),
        addressLowerCase,
        ""
      );
      localRawSigMap[addressLowerCase] = rawSignature;
      localStorage.setItem("rawSigMap", JSON.stringify(localRawSigMap));

      signature = web3.utils.sha3(rawSignature);
      localSigMap[addressLowerCase] = signature;
      localStorage.setItem("sigMap", JSON.stringify(localSigMap));
    }
    return { signature, rawSignature };
  }, []);

  const initLocalWeb3 = useCallback(async () => {
    const queryParams = queryString.parse(window.location.search);
    const walletConnectEnabled = (queryParams ?? {}).walletConnect ?? false;

    // seems like there's a typing issue with Web3Modal
    const providerOptions: any = walletConnectEnabled
      ? {
          walletconnect: {
            package: WalletConnectProvider, // required
            display: {
              name: "WalletConnect",
              description:
                "BETA - not all WalletConnect wallets are supported, use with caution",
            },
            options: {
              infuraId: INFURA_KEY,
            },
          },
        }
      : {};

    const web3Modal = new Web3Modal({
      network: selectedNetwork === "testnet" ? "kovan" : "mainnet", // optional
      cacheProvider: false,
      providerOptions,
    });

    const provider = await web3Modal.connect();
    const web3 = new Web3(provider);
    const currentProvider = web3.currentProvider;
    if (typeof currentProvider === "string") return;
    if (!currentProvider) return;
    const accounts = await web3.eth.getAccounts();
    const address = accounts[0];
    const addressLowerCase = address.toLowerCase();

    setWalletConnectError(false);

    let network = "";
    const netId = await web3.eth.net.getId();
    if (netId === 1) {
      network = "mainnet";
    } else if (netId === 42) {
      network = "testnet";
    }

    if (network !== selectedNetwork) {
      setShowNetworkModal(true);
      return;
    }

    setLocalWeb3(web3);
    setLocalWeb3Address(address);

    // recover from localStorage
    const lsData = localStorage.getItem("convert.transactions");

    const lsTransactions = lsData
      ? JSON.parse(lsData).filter(
          (tx: Transaction) => tx.localWeb3Address === addressLowerCase
        )
      : [];

    try {
      setLoadingTransactions(true);

      if (!disclosureAccepted) {
        const ok = window.confirm(
          `Please take note that this is beta software and is provided on an "as is" and "as available" basis. WBTC Cafe does not give any warranties and will not be liable for any loss, direct or indirect through continued use of this site.`
        );

        setDisclosureAccepted(ok);

        if (!ok) {
          throw new Error("Disclosure declined");
        }
      }

      const { signature, rawSignature } = await getSignatures(address, web3);
      if (!signature) {
        throw new Error("couldn't sign");
      }

      // get from local storage if user has signed in already

      setFsSignature(signature);

      // auth with firestore

      setFsUser(
        await db.getUser(addressLowerCase, { signature, rawSignature })
      );

      const fsTransactions = await db.getTxs(signature);
      const fsIds = fsTransactions.map((f) => f.id);

      const uniqueLsTransactions = lsTransactions.filter(
        (ltx: Transaction) => fsIds.indexOf(ltx.id) < 0
      );
      const transactions = fsTransactions.concat(uniqueLsTransactions);
      setConvertTransactions(List(transactions));

      setFsEnabled(true);
      setLoadingTransactions(false);

      watchWalletData().catch(console.error);
      updateRenVMFees().then(() => gatherFeeData().catch(console.error));
      // initMonitoringTrigger();

      if ((currentProvider as any)?.on) {
        // listen for changes
        (currentProvider as any).on("accountsChanged", async () => {
          window.location.reload();
        });

        (currentProvider as any).on("chainChanged", async () => {
          window.location.reload();
        });

        (currentProvider as any).on("networkChanged", async () => {
          window.location.reload();
        });
      }
    } catch (e) {
      setLoadingTransactions(false);
      setWalletConnectError(true);
      console.error(e);
    }

    return;
  }, [
    db,
    disclosureAccepted,
    gatherFeeData,
    getSignatures,
    selectedNetwork,
    setConvertTransactions,
    setDisclosureAccepted,
    setFsEnabled,
    setFsSignature,
    setFsUser,
    setLoadingTransactions,
    setLocalWeb3,
    setLocalWeb3Address,
    setShowNetworkModal,
    setWalletConnectError,
    updateRenVMFees,
    watchWalletData,
  ]);

  const setAddresses = useCallback(
    async (network: string) => {
      if (network === "testnet") {
        setConvertAdapterAddress(ADAPTER_TEST);
        setWbtcAddress(WBTC_TEST);
      } else {
        setConvertAdapterAddress(ADAPTER_MAIN);
        setWbtcAddress(WBTC_MAIN);
      }
    },
    [setConvertAdapterAddress, setWbtcAddress]
  );

  const setNetwork = useCallback(
    async function (network: "mainnet" | "testnet") {
      setSelectedNetwork(network);
      setSdk(new RenSDK(network));

      await setAddresses(network).catch(console.error);
    },
    [setAddresses, setSdk, setSelectedNetwork]
  );

  return {
    setWbtcAllowance,
    initDataWeb3,
    initLocalWeb3,
    setNetwork,
  };
}

export const Web3Store = createContainer(useWeb3);

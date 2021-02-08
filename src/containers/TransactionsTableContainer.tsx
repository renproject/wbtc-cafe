import { makeStyles } from "@material-ui/core";
import Grid from "@material-ui/core/Grid";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import React, { useEffect, useMemo, useCallback } from "react";

import {
  mintChainMap,
  lockChainMap,
  burnChainMap,
  releaseChainMap,
  CustomParams,
} from "../utils/chainMaps";

import {
  mintMachine,
  burnMachine,
  GatewaySession,
  GatewayTransaction,
  depositMachine,
} from "@renproject/ren-tx";

import RenJS from "@renproject/ren";
import { useMachine } from "@xstate/react";

import { Actor, Interpreter } from "xstate";

import { ActionLink } from "../components/ActionLink";
import { ConversionActions } from "../components/ConversionActions";
import { ConversionStatus } from "../components/ConversionStatus";
import { Store } from "../store/store";
import { Web3Store } from "../store/web3Store";
import { Transaction } from "../types/transaction";
import { TransactionStore } from "../store/transactionStore";
import { LockAndMintTransaction } from "@renproject/interfaces";

const useStyles = makeStyles((theme) => ({
  container: {
    background: "#fff",
    border: "0.5px solid " + theme.palette.divider,
    minHeight: 200,
    height: "100%",
  },
  titleWrapper: {
    paddingBottom: theme.spacing(2),
  },
  actionsCell: {
    minWidth: 150,
  },
  emptyMessage: {
    display: "flex",
    paddingTop: theme.spacing(8),
    justifyContent: "center",
    height: "100%",
  },
}));

const mapGatewaySessionToWBTCTx = (
  session: GatewaySession<CustomParams>,
  awaiting: string,
  error: boolean
): Transaction => {
  const deposit = Object.values(session.transactions || {})[0];
  return {
    id: session.id,
    type: session.type === "mint" ? "mint" : "burn",
    sourceAsset: session.sourceAsset,
    sourceNetwork: session.sourceChain,
    sourceNetworkVersion: session.network === "testnet" ? "testnet" : "mainnet",
    destNetworkVersion: session.network === "testnet" ? "testnet" : "mainnet",
    destAddress: session.destAddress,
    destAsset: session.customParams.destAsset,
    destNetwork: session.destChain,
    amount: session.targetAmount,
    renBtcAddress: session.gatewayAddress,
    localWeb3Address: session.userAddress,
    sourceTxHash: deposit?.sourceTxHash,
    sourceAmount: deposit?.sourceTxAmount,
    sourceTxConfs: deposit?.sourceTxConfs || 0,
    sourceTxVOut: deposit?.rawSourceTx?.transaction.vOut || 0,
    destTxHash: deposit?.destTxHash,
    renResponse: deposit?.renResponse as LockAndMintTransaction["out"],
    renSignature: deposit?.renSignature,
    params: { ...(session.customParams?.params || {}), nonce: session.nonce },
    adapterAddress: session.customParams.adapterAddress,
    maxSlippage: session.customParams.maxSlippage,
    minSwapProceeds: session.customParams.minSwapProceeds,
    minExchangeRate: session.customParams.minExchangeRate,
    instant: false,
    awaiting,
    error,
  };
};

const mapWBTCTxToGatewaySession = (
  tx: Transaction
): GatewaySession<CustomParams> => {
  // Don't restore txs because we old model doesnt have txhash in the correct format
  /* const transactions: { [k in string]: GatewayTransaction } = false
   *   ? {
   *       [tx.sourceTxHash]: {
   *         sourceTxHash: tx.sourceTxHash,
   *         sourceTxAmount: Number(tx.sourceAmount) || 0,
   *         sourceTxConfs: tx.sourceTxConfs || 0,
   *         sourceTxVOut: tx.sourceTxVOut,
   *         sourceTxConfTarget: 2,
   *         destTxConfs: tx.destTxConfs,
   *         destTxHash: tx.destTxHash,
   *         destTxConfTarget: 6,
   *         rawSourceTx: {
   *           transaction: {
   *             confirmations: tx.sourceTxConfs,
   *             txHash: tx.sourceTxHash,
   *             vOut: tx.sourceTxVOut,
   *             amount: Number(tx.sourceAmount),
   *           },
   *           amount: Number(tx.sourceAmount),
   *         },
   *       },
   *     }
   *   : {}; */

  return {
    id: tx.id,
    type: tx.sourceAsset.toLowerCase() === "btc" ? "mint" : "burn",
    gatewayAddress: tx.renBtcAddress,
    sourceAsset: tx.sourceAsset,
    sourceChain: tx.sourceNetwork,
    network: tx.sourceNetworkVersion === "testnet" ? "testnet" : "mainnet",
    destAddress: tx.destAddress,
    destChain: tx.destNetwork,
    targetAmount: tx.amount,
    userAddress: tx.localWeb3Address,
    expiryTime: Number.POSITIVE_INFINITY,
    nonce: tx.params?.nonce,
    customParams: {
      params: tx.params,
      adapterAddress: tx.adapterAddress,
      maxSlippage: tx.maxSlippage,
      minSwapProceeds: tx.minSwapProceeds,
      minExchangeRate: Number(tx.minExchangeRate),
      destAsset: tx.destAsset === "BTC" ? "BTC" : "WBTC",
    },
    transactions: {},
  };
};

export const TransactionsTableContainer: React.FC = () => {
  const classes = useStyles();
  const {
    convertTransactions,
    selectedNetwork,
    fsSignature,
    loadingTransactions,
    walletConnectError,
    localWeb3,
  } = Store.useContainer();

  const { initLocalWeb3 } = Web3Store.useContainer();

  const transactions = convertTransactions.filter(
    (t) => t.sourceNetworkVersion === selectedNetwork
  );

  const signedIn = fsSignature;
  const error = walletConnectError;

  const showTransactions =
    signedIn && !loadingTransactions && !error && transactions.size > 0;

  const sdk = useMemo(() => new RenJS("testnet"), []);
  const providers = useMemo(() => ({ ethereum: localWeb3?.currentProvider }), [
    localWeb3,
  ]);

  return (
    <div className={classes.container}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell align="left">Transaction</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>
              <div className={classes.actionsCell}></div>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {showTransactions &&
            transactions
              .sort((txa, txb) => {
                return (txa.txCreatedAt ?? 0) < (txb?.txCreatedAt ?? 0) ? 1 : 0;
              })
              .map((tx, i) => {
                return tx.sourceAsset.toLowerCase() === "btc" ? (
                  <MintTxProcessor
                    key={tx.id}
                    tx={tx}
                    sdk={sdk}
                    providers={providers}
                  />
                ) : (
                  <BurnTxProcessor
                    key={tx.id}
                    tx={tx}
                    sdk={sdk}
                    providers={providers}
                  />
                );
              })}
        </TableBody>
      </Table>
      <div>
        {!showTransactions && (
          <div className={classes.emptyMessage}>
            {loadingTransactions ? (
              <Typography variant="caption">Loading transactions...</Typography>
            ) : (
              <React.Fragment>
                {error ? (
                  <Typography variant="caption">
                    Connect failed.{" "}
                    <ActionLink onClick={initLocalWeb3}>Retry</ActionLink>
                  </Typography>
                ) : signedIn && !transactions.size ? (
                  <Typography variant="caption">No transactions</Typography>
                ) : !signedIn ? (
                  <Typography variant="caption">
                    Please{" "}
                    <ActionLink onClick={initLocalWeb3}>
                      connect wallet
                    </ActionLink>{" "}
                    to view transactions
                  </Typography>
                ) : null}
              </React.Fragment>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function usePersistence<TContext extends { tx: GatewaySession }>(
  service: Interpreter<TContext, any, any>
) {
  const { updateTx } = TransactionStore.useContainer();
  useEffect(() => {
    const subscription = service.subscribe((state: any) => {
      updateTx(
        mapGatewaySessionToWBTCTx(
          state.context.tx,
          state.value as string,
          false
        )
      );
    });
    return () => subscription.unsubscribe();
  }, [service, updateTx]);
}

const BurnTxProcessor: React.FC<{
  tx: Transaction;
  sdk: RenJS;
  providers: any;
}> = ({ tx, sdk, providers }) => {
  const [current, send, service] = useMachine(burnMachine, {
    context: {
      tx: mapWBTCTxToGatewaySession(tx),
      sdk,
      providers,
      fromChainMap: burnChainMap,
      toChainMap: releaseChainMap,
    },
    //devTools: true,
  });

  usePersistence(service);

  // Clean up machine when component unmounts
  useEffect(
    () => () => {
      service.stop();
    },
    [service]
  );

  const remove = () => {
    // removeTx(tx);
  };

  const castTx = useMemo(() => {
    let awaiting = "btc-init";
    if (current.value) {
      const statusMap: { [key in string]: string } = {
        restoring: "ren-settle",
        restored: "ren-settle",
        srcSettling: "eth-settle",
        srcConfirmed: "ren-settle",
        accepted: "btc-init",
        claiming: "btc-settle",
        destInitiated: "eth-settle",
        completed: "",
      };
      awaiting = statusMap[current.value as string];
    }
    return mapGatewaySessionToWBTCTx(
      current.context.tx as any,
      awaiting,
      false
    );
  }, [current]);

  return (
    <TableRow>
      <TableCell align="left">
        <Typography variant="caption">
          {current.context.tx.targetAmount} {current.context.tx.sourceAsset} →{" "}
          {(current.context.tx.customParams as CustomParams).destAsset}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="caption">
          <ConversionStatus tx={castTx} />
        </Typography>
      </TableCell>
      <TableCell>
        <Grid container justify="flex-end">
          <ConversionActions tx={castTx} mint={() => {}} />
        </Grid>
      </TableCell>
    </TableRow>
  );
};

const MintTxProcessor: React.FC<{
  tx: Transaction;
  sdk: RenJS;
  providers: any;
}> = ({ tx, sdk, providers }) => {
  const {
    completeConvertToEthereum,
    // initConvertFromEthereum,
  } = TransactionStore.useContainer();

  const [current, send, service] = useMachine(mintMachine, {
    context: {
      tx: mapWBTCTxToGatewaySession(tx) as any,
      sdk,
      providers,
      fromChainMap: lockChainMap,
      toChainMap: mintChainMap,
    },
    devTools: true,
  });

  // We listen to state transitions to de-couple persistance
  usePersistence(service);

  const remove = () => {
    send("EXPIRED");
  };

  // We have to determine which deposit is the "correct" one for a transaction
  // We could list out every deposit, and all will be able to proceed correctly
  // but that is not a recommended flow to introduce to users
  const activeDeposit = useMemo<{
    deposit: GatewayTransaction;
    machine: Actor<typeof depositMachine>;
  } | null>(() => {
    const deposit = Object.values(current.context.tx.transactions)[0];
    if (!deposit || !current.context.depositMachines) return null;
    const machine = current.context.depositMachines[deposit.sourceTxHash];
    if (!machine) return null;
    return { deposit, machine };
  }, [current.context]);

  const castTx = useMemo(() => {
    let awaiting = "btc-init";
    if (activeDeposit?.machine) {
      const statusMap: { [key in string]: string } = {
        restoring: "ren-settle",
        restored: "ren-settle",
        srcSettling: "btc-settle",
        srcConfirmed: "ren-settle",
        accepted: "eth-init",
        claiming: "eth-settle",
        destInitiated: "eth-settle",
        completed: "",
      };
      awaiting = statusMap[activeDeposit.machine.state.value];
    }
    return mapGatewaySessionToWBTCTx(
      current.context.tx as any,
      awaiting,
      false
    );
  }, [current, activeDeposit]);

  const mint = useCallback(async () => {
    if (!activeDeposit) return;
    if (!activeDeposit?.deposit) return;
    // completeConvertToEthereum
    // const to = current.context.toChainMap.ethereum(current.context);
    // if (!to.getMintParams) return;
    // const res = await to.getMintParams("btc");
    // if (!res || !res.contractCalls) return;
    // const call = res.contractCalls[1];
    // const params = call.contractParams?.reduce((c, n) => {
    //   c[n.name] = n.value;
    //   return c;
    // }, {} as any);
    debugger;
    activeDeposit.machine.send({
      type: "CLAIM",
      data: {
        _msgSender: "0xEA8b2fF0d7f546AFAeAE1771306736357dEFa434",
      },
    });
  }, [send, activeDeposit, current.context]);

  return (
    <TableRow>
      <TableCell align="left">
        <Typography variant="caption">
          {current.context.tx.targetAmount} {current.context.tx.sourceAsset} →{" "}
          {current.context.tx.sourceAsset}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="caption">
          <ConversionStatus tx={castTx} />
        </Typography>
      </TableCell>
      <TableCell>
        <Grid container justify="flex-end">
          <ConversionActions tx={castTx} mint={mint} />
        </Grid>
      </TableCell>
    </TableRow>
  );
};

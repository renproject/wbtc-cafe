import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import React, { useRef } from "react";
import NumberFormat from "react-number-format";
import AddressValidator from "wallet-address-validator";
import { makeStyles } from "@material-ui/core";

import { ActionLink } from "../components/ActionLink";
import { CurrencyInput } from "../components/CurrencyInput";
import { Store } from "../store/store";
import { TransactionStore } from "../store/transactionStore";
import { Web3Store } from "../store/web3Store";
import { Asset, MINI_ICON_MAP, NAME_MAP } from "../utils/assets";
import { FeeStore } from "../store/feeStore";

const useStyles = makeStyles((theme) => ({
  container: {
    background: "#fff",
    border: "0.5px solid " + theme.palette.divider,
  },
  transferActionTabs: {
    margin: "0px auto",
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    "& div.MuiToggleButtonGroup-root": {
      width: "100%",
    },
    "& button": {
      width: "50%",
    },
  },
  depositAddress: {
    width: "100%",
  },
  actionButtonContainer: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    textAlign: "center",
    "& button": {
      margin: "0px auto",
      fontSize: 12,
      minWidth: 175,
      padding: theme.spacing(1),
    },
  },
  amountField: {
    width: "100%",
  },
  actions: {
    paddingTop: theme.spacing(1),
    padding: theme.spacing(3),
  },
  transactionsContainer: {
    padding: theme.spacing(3),
    paddingTop: theme.spacing(0),
    marginTop: theme.spacing(2),
    borderTop: "1px solid #EBEBEB",
  },
  actionsContainer: {
    borderRadius: theme.shape.borderRadius,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  destChooser: {
    width: "100%",
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    "& div.MuiToggleButtonGroup-root": {
      width: "100%",
    },
    "& button": {
      width: "50%",
    },
  },
  fees: {
    width: "100%",
    border: "1px solid " + theme.palette.divider,
    fontSize: 12,
    padding: theme.spacing(1),
    paddingBottom: 0,
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1.5),
    display: "flex",
    flexDirection: "column",
    "& span": {
      marginBottom: theme.spacing(1),
    },
  },
  slippage: {
    width: "100%",
    border: "1px solid " + theme.palette.divider,
    fontSize: 12,
    padding: theme.spacing(1),
    paddingBottom: 0,
    marginTop: theme.spacing(1),
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing(3),
    "& span": {
      marginBottom: theme.spacing(1),
    },
  },
  slippageRate: {
    "& a": {
      marginLeft: theme.spacing(1),
    },
    "& span": {
      marginLeft: theme.spacing(1),
    },
  },
  icon: {
    width: 16,
    height: 16,
    marginRight: theme.spacing(0.75),
  },
  toggle: {
    "& button": {
      minHeight: "auto",
    },
  },
  title: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(3),
  },
  total: {
    fontWeight: "bold",
  },
  customSlippage: {
    width: 30,
    fontSize: 12,
    marginTop: -4,
    marginLeft: theme.spacing(1),
  },
  amountContainer: {
    flex: 1,
  },
  maxLink: {
    fontSize: 12,
    textDecoration: "underline",
    cursor: "pointer",
    paddingLeft: theme.spacing(1),
    paddingTop: theme.spacing(0.5),
  },
}));

export const TransferContainer: React.FC = () => {
  const classes = useStyles();
  const {
    convertAmount,
    convertDestination,
    convertMaxSlippage,
    convertExchangeRate,
    convertConversionTotal,
    convertAdapterAddress,
    convertSelectedDirection,
    convertNetworkFee,
    convertRenVMFee,
    convertAdapterWbtcAllowance,
    convertDestinationValid,
    convertAdapterWbtcAllowanceRequesting,

    localWeb3Address,
    localWeb3,
    selectedNetwork,
    wbtcBalance,
    walletConnectError,
    fsUser,
    loadingTransactions,
    setDepositModalTx,
    setShowDepositModal,

    setConvertDestination,
    setConvertSelectedDirection,
    setConvertAmount,
    setConvertMaxSlippage,
    setConvertDestinationValid,
  } = Store.useContainer();

  const { addTx } = TransactionStore.useContainer();

  const { gatherFeeData } = FeeStore.useContainer();

  const { initLocalWeb3, setWbtcAllowance } = Web3Store.useContainer();

  const wbtcAmountRef = useRef<any>(null);
  const ethAddressRef = useRef<any>(null);

  const fillWalletAddress = () => {
    const address = localWeb3Address;
    ethAddressRef.current.value = address;
    setConvertDestination(address);
    setConvertDestinationValid(AddressValidator.validate(address, "ETH"));
  };

  const newDeposit = async () => {
    if (!localWeb3) return initLocalWeb3();

    const amount = convertAmount;
    const destination = convertDestination;
    const network = selectedNetwork;
    const asset = Asset.WBTC;
    const maxSlippage = convertMaxSlippage;
    const exchangeRate = convertExchangeRate;
    const expectedTotal = convertConversionTotal;
    const minSwapProceeds = Number(
      (Number(expectedTotal) * Number(1 - maxSlippage)).toFixed(6)
    );
    const adapterAddress = convertAdapterAddress;

    const tx = {
      id: "tx-" + Math.floor(Math.random() * 10 ** 16),
      type: "convert",
      instant: false,
      awaiting: "btc-init",
      sourceAsset: Asset.BTC,
      sourceAmount: "",
      sourceNetwork: "bitcoin",
      sourceNetworkVersion: network,
      destAddress: destination,
      destNetwork: "ethereum",
      destNetworkVersion: network,
      destAsset: asset,
      destTxHash: "",
      destTxConfs: 0,
      amount,
      error: false,
      swapReverted: false,
      minExchangeRate: exchangeRate,
      maxSlippage,
      minSwapProceeds,
      exchangeRateOnSubmit: convertExchangeRate,
      adapterAddress,
      localWeb3Address: localWeb3Address.toLowerCase(),
    };

    setDepositModalTx(tx);
    setShowDepositModal(true);
  };

  const newWithdraw = async () => {
    if (!localWeb3) return initLocalWeb3();

    const amount = convertAmount;
    const destination = convertDestination;
    const network = selectedNetwork;
    const asset = Asset.WBTC;
    const maxSlippage = convertMaxSlippage;
    const exchangeRate = convertExchangeRate;
    const minSwapProceeds =
      Number(Number(amount) * Number(exchangeRate)) * Number(1 - maxSlippage);
    const adapterAddress = convertAdapterAddress;

    const tx = {
      id: "tx-" + Math.floor(Math.random() * 10 ** 16),
      type: "convert",
      instant: false,
      awaiting: "eth-settle",
      sourceAsset: asset,
      sourceAmount: amount,
      sourceNetwork: "ethereum",
      sourceNetworkVersion: network,
      sourceTxHash: "",
      sourceTxConfs: 0,
      destAddress: destination,
      destNetwork: "bitcoin",
      destNetworkVersion: network,
      destAsset: Asset.BTC,
      amount,
      error: false,
      minExchangeRate: exchangeRate,
      maxSlippage,
      minSwapProceeds,
      adapterAddress,
      localWeb3Address: localWeb3Address.toLowerCase(),
    };

    addTx(tx);
    //initConvertFromEthereum(tx).catch(console.error);
  };

  const selectedDirection = convertSelectedDirection;

  const amount = convertAmount;
  const exchangeRate = convertExchangeRate;
  const fee = convertNetworkFee;
  const renVMFee = convertRenVMFee;
  const total = convertConversionTotal;

  const allowance = convertAdapterWbtcAllowance;
  const hasAllowance = Number(amount) <= Number(allowance);
  const allowanceRequesting = convertAdapterWbtcAllowanceRequesting;
  const validUser = fsUser && fsUser.uid;

  const convertAddressValid = convertDestinationValid;
  const canConvertTo =
    Number(amount) > 0.00010001 &&
    convertAddressValid &&
    !walletConnectError &&
    validUser &&
    !loadingTransactions;
  const canConvertFrom =
    Number(total) > 0.00010001 &&
    Number(amount) <= Number(wbtcBalance) &&
    convertAddressValid &&
    !walletConnectError &&
    validUser &&
    !loadingTransactions;

  const sourceAsset = selectedDirection ? "WBTC" : "BTC";
  const destAsset = selectedDirection ? "BTC" : "WBTC";

  const maxSlippage = convertMaxSlippage;
  const slippageOptions = [0.005, 0.01, 0.05];

  return (
    <div className={classes.container}>
      <div className={classes.actionsContainer}>
        <Grid className={classes.actions}>
          <Grid container justify="center">
            <Grid item xs={12}>
              {
                <Grid container className={classes.transferActionTabs}>
                  <ToggleButtonGroup
                    size="small"
                    className={classes.toggle}
                    value={String(selectedDirection)}
                    exclusive
                    onChange={(_event, newValue) => {
                      if (newValue) {
                        const nv = Number(newValue);
                        setConvertSelectedDirection(nv);
                        setConvertAmount("");
                        setConvertDestination("");
                        gatherFeeData().catch(console.error);
                      }
                    }}
                  >
                    <ToggleButton key={0} value={"0"}>
                      <img
                        alt=""
                        role="presentation"
                        src={MINI_ICON_MAP[Asset.WBTC]}
                        className={classes.icon}
                      />{" "}
                      Get WBTC
                    </ToggleButton>
                    <ToggleButton key={1} value={"1"}>
                      <img
                        alt=""
                        role="presentation"
                        src={MINI_ICON_MAP[Asset.BTC]}
                        className={classes.icon}
                      />{" "}
                      Get BTC
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Grid>
              }

              {selectedDirection === 0 && (
                <React.Fragment>
                  <Grid alignItems="center" container>
                    <Grid item xs={12}>
                      <CurrencyInput
                        onAmountChange={(value) => {
                          const amount = value < 0 ? "" : value;
                          setConvertAmount(amount);
                          if (amount !== "") {
                            gatherFeeData(amount).catch(console.error);
                          }
                        }}
                        onCurrencyChange={() => {}}
                        items={["BTC"]}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Grid container direction="row" alignItems="center">
                        <Grid item className={classes.amountContainer}>
                          <TextField
                            inputRef={ethAddressRef}
                            placeholder="Ethereum Destination Address"
                            className={classes.depositAddress}
                            margin="dense"
                            variant="outlined"
                            onChange={(event) => {
                              setConvertDestination(event.target.value);
                              setConvertDestinationValid(
                                AddressValidator.validate(
                                  event.target.value,
                                  "ETH"
                                )
                              );
                            }}
                          />
                        </Grid>
                        <ActionLink
                          className={classes.maxLink}
                          disabled={!localWeb3Address}
                          onClick={() => {
                            fillWalletAddress();
                          }}
                        >
                          Wallet
                        </ActionLink>
                      </Grid>
                    </Grid>
                  </Grid>
                </React.Fragment>
              )}

              {selectedDirection === 1 && (
                <React.Fragment>
                  <Grid alignItems="center" container>
                    <Grid item xs={12}>
                      <Grid container direction="row" alignItems="center">
                        <Grid item className={classes.amountContainer}>
                          <CurrencyInput
                            inputRef={wbtcAmountRef}
                            onAmountChange={(value) => {
                              const amount = value < 0 ? 0 : value;
                              setConvertAmount(amount);
                              gatherFeeData(amount).catch(console.error);
                            }}
                            onCurrencyChange={() => {}}
                            items={["WBTC"]}
                          />
                        </Grid>
                        <ActionLink
                          className={classes.maxLink}
                          onClick={() => {
                            const bal = wbtcBalance;
                            wbtcAmountRef.current.value = bal;
                            setConvertAmount(bal);
                            gatherFeeData().catch(console.error);
                          }}
                        >
                          Max
                        </ActionLink>
                      </Grid>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        id="standard-read-only-input"
                        placeholder="Bitcoin Destination Address"
                        className={classes.depositAddress}
                        margin="dense"
                        variant="outlined"
                        onChange={(event) => {
                          setConvertDestination(event.target.value);
                          setConvertDestinationValid(
                            AddressValidator.validate(
                              event.target.value,
                              selectedDirection ? "BTC" : "ETH",
                              selectedNetwork === "testnet" ? "testnet" : "prod"
                            )
                          );
                        }}
                      />
                    </Grid>
                  </Grid>
                </React.Fragment>
              )}

              <Grid item xs={12}>
                <Grid container direction="column" className={classes.fees}>
                  <Grid item xs={12}>
                    <Grid container justify="space-between">
                      <span>Exchange Rate</span>
                      <span>
                        {exchangeRate && amount
                          ? `1 ${sourceAsset} = ${Number(exchangeRate).toFixed(
                              4
                            )} ${destAsset}`
                          : "-"}{" "}
                      </span>
                    </Grid>
                    <Grid container justify="space-between">
                      <span>RenVM Fee</span>
                      <span>
                        {renVMFee && amount
                          ? `${Number(renVMFee).toFixed(8)} BTC`
                          : "-"}
                      </span>
                    </Grid>
                    <Grid container justify="space-between">
                      <span>{NAME_MAP[Asset.BTC]} Fee</span>
                      <span>
                        {fee && amount ? `${Number(fee).toFixed(8)} BTC` : "-"}
                      </span>
                    </Grid>
                    <Grid
                      container
                      justify="space-between"
                      className={classes.total}
                    >
                      <span>You Will Receive</span>
                      <span>
                        {total && amount
                          ? `~${Number(total).toFixed(8)} ${destAsset}`
                          : "-"}
                      </span>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Grid container direction="column" className={classes.slippage}>
                  <Grid item xs={12}>
                    <Grid container justify="space-between">
                      <span>Max. slippage</span>
                      <div className={classes.slippageRate}>
                        {slippageOptions.map((r) => {
                          const label = `${r * 100}%`;
                          if (maxSlippage === r) {
                            return <span key={r}>{label}</span>;
                          } else {
                            return (
                              <ActionLink
                                key={r}
                                onClick={() => {
                                  setConvertMaxSlippage(r);
                                }}
                              >
                                {label}
                              </ActionLink>
                            );
                          }
                        })}
                        <NumberFormat
                          className={classes.customSlippage}
                          decimalScale={2}
                          suffix={"%"}
                          allowLeadingZeros={true}
                          allowNegative={false}
                          onValueChange={(values) => {
                            const float = values.floatValue;
                            if (!float) {
                              setConvertMaxSlippage(slippageOptions[0]);
                            } else if (float > 100) {
                              setConvertMaxSlippage(1);
                            } else {
                              setConvertMaxSlippage(
                                Number((float / 100).toFixed(4))
                              );
                            }
                          }}
                        />
                      </div>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          {selectedDirection === 0 && (
            <Grid
              container
              justify="center"
              className={classes.actionButtonContainer}
            >
              <Grid item xs={12}>
                <Button
                  disabled={!canConvertTo}
                  variant={canConvertTo ? "outlined" : "contained"}
                  size="small"
                  onClick={newDeposit}
                >
                  Get WBTC
                </Button>
              </Grid>
            </Grid>
          )}

          {selectedDirection === 1 && (
            <Grid
              container
              justify="center"
              className={classes.actionButtonContainer}
            >
              <Grid item xs={12}>
                {hasAllowance ? (
                  <Button
                    disabled={!canConvertFrom}
                    size="small"
                    variant={canConvertFrom ? "outlined" : "contained"}
                    onClick={newWithdraw}
                  >
                    Get BTC
                  </Button>
                ) : (
                  <Button
                    disabled={allowanceRequesting}
                    size="small"
                    variant={!allowanceRequesting ? "outlined" : "contained"}
                    onClick={setWbtcAllowance}
                  >
                    Allow WBTC
                  </Button>
                )}
              </Grid>
            </Grid>
          )}
        </Grid>
      </div>
    </div>
  );
};

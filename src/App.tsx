import * as queryString from "query-string";

import React from "react";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import Marquee from "react-smooth-marquee";
import { makeStyles } from "@material-ui/core";

import { Footer } from "./components/Footer";
import { CancelModalContainer } from "./containers/CancelModalContainer";
import { DepositModalContainer } from "./containers/DepositModalContainer";
import { NavContainer } from "./containers/NavContainer";
import { NetworkModalContainer } from "./containers/NetworkModalContainer";
import { SwapRevertModalContainer } from "./containers/SwapRevertModalContainer";
import { TransactionsTableContainer } from "./containers/TransactionsTableContainer";
import { TransferContainer } from "./containers/TransferContainer";
import { ViewGatewayContainer } from "./containers/ViewGatewayContainer";
import { Web3Store } from "./store/web3Store";
import { FeeStore } from "./store/feeStore";

const useStyles = makeStyles((theme) => ({
  container: {
    maxWidth: 450,
  },
  contentContainer: {
    paddingTop: theme.spacing(3),
  },
  transfersContainer: {
    padding: theme.spacing(3),
  },
  disclosure: {
    "& div": {
      border: "0.5px solid " + theme.palette.divider,
      background: "#fff",
      paddingTop: theme.spacing(1.5),
      paddingBottom: theme.spacing(1),
      paddingLeft: theme.spacing(2),
      paddingRight: theme.spacing(2),
      fontSize: 12,

      "& div": {
        border: "none",
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
      },
    },
  },
}));

export const App: React.FC = () => {
  const { updateRenVMFees } = FeeStore.useContainer();
  const { initDataWeb3, setNetwork } = Web3Store.useContainer();
  const classes = useStyles();

  React.useEffect(() => {
    const params = queryString.parse(window.location.search);

    const network = params.network === "testnet" ? "testnet" : "mainnet";

    // default to mainnet
    setNetwork(network).catch(console.error);

    initDataWeb3(network)
      .catch(console.error)
      .then(() => {
        updateRenVMFees().catch(console.error);
      });
  }, []); //eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <DepositModalContainer />
      <CancelModalContainer />
      <ViewGatewayContainer />
      <NetworkModalContainer />
      <SwapRevertModalContainer />
      <NavContainer />
      <Container fixed maxWidth="lg">
        <Grid container className={classes.contentContainer} spacing={2}>
          <Grid item xs={12} className={classes.disclosure}>
            <Marquee>
              Welcome to the WBTC Cafe! This is a new project, so please use
              caution.
            </Marquee>
          </Grid>
          <Grid item xs={12} sm={12} md={4}>
            <TransferContainer />
          </Grid>
          <Grid
            item
            xs={12}
            sm={12}
            md={8}
            className={classes.transfersContainer}
          >
            <TransactionsTableContainer />
          </Grid>
        </Grid>
      </Container>
      <Footer />
    </>
  );
};

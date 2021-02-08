import Backdrop from "@material-ui/core/Backdrop";
import Button from "@material-ui/core/Button";
import Fade from "@material-ui/core/Fade";
import Grid from "@material-ui/core/Grid";
import Modal from "@material-ui/core/Modal";
import Typography from "@material-ui/core/Typography";
import classNames from "classnames";
import React from "react";
import { makeStyles } from "@material-ui/core";

import { Store } from "../store/store";
import { TransactionStore } from "../store/transactionStore";
import { Asset } from "../utils/assets";

const useStyles = makeStyles((theme) => ({
  modal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(2),
    [theme.breakpoints.down("xs")]: {
      overflowY: "scroll",
      overflowX: "hidden",
      alignItems: "flex-start",
    },
  },
  modalContent: {
    backgroundColor: "#fff",
    width: 400,
    maxWidth: "100%",
    padding: theme.spacing(2),
  },
  title: {
    display: "flex",
    alignItems: "center",
    // marginBottom: theme.spacing(2),
    fontWeight: "bold",
  },
  titleContainer: {
    marginBottom: theme.spacing(3),
  },
  content: {
    fontSize: 14,
    width: "100%",
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  button: {
    marginTop: theme.spacing(1),
  },
  receiptTitle: {
    fontSize: 14,
  },
  receiptAmount: {
    textAlign: "right",
    fontSize: 14,
  },
  total: {
    fontWeight: "bold",
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2),
  },
  rates: {
    // textDecoration: 'italic',
    marginBottom: theme.spacing(2),
  },
  continueTitle: {
    marginBottom: theme.spacing(1),
  },
}));

export const SwapRevertModalContainer: React.FC = () => {
  const classes = useStyles();
  const {
    showSwapRevertModal,
    swapRevertModalTx,
    swapRevertModalExchangeRate,
    fees,
    setShowSwapRevertModal,
    setSwapRevertModalTx,
    setSwapRevertModalExchangeRate,
    convertTransactions,
  } = Store.useContainer();

  const {
    completeConvertToEthereum,
    updateTx,
  } = TransactionStore.useContainer();

  const transaction = convertTransactions
    .filter((tx) => tx.id === swapRevertModalTx)
    .first(null);

  if (!swapRevertModalTx || !transaction || !fees) {
    return <div />;
  }

  const amount = Number(transaction.sourceAmount).toFixed(8);
  const fixedFee = Number(fees.lock?.div(10 ** 8).toNumber());
  const dynamicFeeRate = Number(fees.mint / 10000);
  const renVMFee = (Number(transaction.sourceAmount) * dynamicFeeRate).toFixed(
    8
  );
  const networkFee = Number(fixedFee).toFixed(8);
  const net =
    Number(Number(amount) - Number(renVMFee) - fixedFee) > 0
      ? Number(Number(amount) - Number(renVMFee) - fixedFee).toFixed(8)
      : "0.00000000";
  const total = Number(
    Number(net) * Number(swapRevertModalExchangeRate)
  ).toFixed(8);
  const minRate = Number(Number(transaction.minExchangeRate).toFixed(8));

  return (
    <Modal
      aria-labelledby="transition-modal-title"
      aria-describedby="transition-modal-description"
      className={classes.modal}
      open={showSwapRevertModal}
      onClose={() => {
        setShowSwapRevertModal(false);
        setSwapRevertModalTx(null);
        setSwapRevertModalExchangeRate("");
      }}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
      }}
    >
      <Fade in={showSwapRevertModal}>
        <Grid container className={classes.modalContent}>
          <Typography variant="subtitle1" className={classes.title}>
            Exchange Rate Change
          </Typography>

          <Typography variant="body1" className={classes.content}>
            The swap has increased in price since you initiated your
            transaction. Would you like to complete the swap at the current
            market&nbsp;rate?
          </Typography>
          <Grid item xs={12}>
            <Grid container>
              <Grid item xs={6}>
                <Typography variant="body1" className={classes.receiptTitle}>
                  Initial Min. Rate
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body1" className={classes.receiptAmount}>
                  {`${minRate} WBTC/renBTC`}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Grid container className={classes.rates}>
              <Grid item xs={6}>
                <Typography variant="body1" className={classes.receiptTitle}>
                  Current Market Rate
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body1" className={classes.receiptAmount}>
                  {`${swapRevertModalExchangeRate} WBTC/renBTC`}
                </Typography>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Grid container>
              <Grid item xs={12}>
                <Typography
                  variant="body1"
                  className={classNames(
                    classes.receiptTitle,
                    classes.total,
                    classes.continueTitle
                  )}
                >
                  Continuing With renBTC
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Grid container>
              <Grid item xs={6}>
                <Typography variant="body1" className={classes.receiptTitle}>
                  Bitcoin Sent
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body1" className={classes.receiptAmount}>
                  {`${amount} BTC`}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Grid container>
              <Grid item xs={6}>
                <Typography variant="body1" className={classes.receiptTitle}>
                  RenVM Fee
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body1" className={classes.receiptAmount}>
                  {`${renVMFee} BTC`}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Grid container>
              <Grid item xs={6}>
                <Typography variant="body1" className={classes.receiptTitle}>
                  Bitcoin Fee
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body1" className={classes.receiptAmount}>
                  {`${networkFee} BTC`}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Grid container>
              <Grid item xs={6}>
                <Typography variant="body1" className={classes.receiptTitle}>
                  Funds Swapped
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body1" className={classes.receiptAmount}>
                  {net} {Asset.renBTC}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Grid container>
              <Grid item xs={6}>
                <Typography
                  variant="body1"
                  className={classNames(classes.receiptTitle, classes.total)}
                >
                  You Will Receive
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography
                  variant="body1"
                  className={classNames(classes.receiptAmount, classes.total)}
                >
                  {`~${total} WBTC`}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Button
            variant={"outlined"}
            size="large"
            color="primary"
            fullWidth={true}
            className={classNames(classes.button)}
            onClick={() => {
              completeConvertToEthereum(transaction, Asset.WBTC).catch(
                console.error
              );
              setShowSwapRevertModal(false);
            }}
          >
            Continue Swap
          </Button>
          <Button
            size="large"
            color="primary"
            fullWidth={true}
            className={classNames(classes.button)}
            onClick={() => {
              const newTx = updateTx({ ...transaction, swapReverted: true });
              completeConvertToEthereum(newTx, Asset.renBTC).catch(
                console.error
              );
              setShowSwapRevertModal(false);
            }}
          >
            Get {Asset.renBTC} Instead
          </Button>
        </Grid>
      </Fade>
    </Modal>
  );
};

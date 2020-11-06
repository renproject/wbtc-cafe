import Backdrop from "@material-ui/core/Backdrop";
import Button from "@material-ui/core/Button";
import Fade from "@material-ui/core/Fade";
import Grid from "@material-ui/core/Grid";
import Modal from "@material-ui/core/Modal";
import Typography from "@material-ui/core/Typography";
import classNames from "classnames";
import QRCode from "qrcode.react";
import React from "react";
import { makeStyles } from "@material-ui/core";

import { ActionLink } from "../components/ActionLink";
import { Store } from "../store/store";

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
    width: 360,
    maxWidth: "100%",
    padding: theme.spacing(2),
  },
  signInInput: {
    width: "100%",
  },
  title: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(2),
    fontWeight: "bold",
  },
  arrow: {
    width: 30,
  },
  subtitle: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(3),
  },
  divider: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  dividerTotal: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  cancelButton: {
    marginTop: theme.spacing(3),
  },
  backButton: {
    marginTop: theme.spacing(1),
  },
  content: {
    fontSize: 14,
    width: "100%",
  },
  address: {
    fontSize: 12,
    marginTop: theme.spacing(2),
    padding: theme.spacing(1),
    border: "1px solid " + theme.palette.divider,
    fontWeight: "bold",
    width: "100%",
  },
  addressWrapper: {
    width: "100%",
    position: "relative",
    display: "flex",
  },
  copyLink: {
    textDecoration: "underline",
    cursor: "pointer",
    fontSize: 12,
    marginTop: theme.spacing(1),
  },
  qrCode: {
    width: "100%",
    paddingTop: theme.spacing(2),
  },
}));

export const ViewGatewayContainer: React.FC = () => {
  const classes = useStyles();
  const {
    showGatewayModal,
    gatewayModalTx,
    setShowGatewayModal,
    setGatewayModalTx,
    convertTransactions,
  } = Store.useContainer();

  const goBack = () => {
    setShowGatewayModal(false);
    setGatewayModalTx(undefined);
  };

  const transaction = gatewayModalTx;

  if (!gatewayModalTx) return null;

  return transaction ? (
    <Modal
      aria-labelledby="transition-modal-title"
      aria-describedby="transition-modal-description"
      className={classes.modal}
      open={showGatewayModal}
      onClose={goBack}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
      }}
    >
      <Fade in={showGatewayModal}>
        <Grid container className={classes.modalContent}>
          <Grid container alignItems="center" justify="center">
            <Grid item xs={12}>
              <Grid container>
                {
                  <Typography variant="subtitle1" className={classes.title}>
                    Gateway Address
                  </Typography>
                }

                <Typography variant="body1" className={classes.content}>
                  Send {transaction.amount} BTC to:
                </Typography>

                <div className={classes.addressWrapper}>
                  <input
                    readOnly
                    id="gatewayAddress"
                    className={classes.address}
                    value={transaction.renBtcAddress || "Loading..."}
                  />
                </div>

                <ActionLink
                  className={classes.copyLink}
                  onClick={() => {
                    const copyText = document.getElementById("gatewayAddress");
                    if (copyText) {
                      (copyText as any).select();
                      (copyText as any).setSelectionRange(0, 99999);
                      document.execCommand("copy");
                      alert(
                        "Address copied to clipboard: " +
                          (copyText as any).value
                      );
                    }
                  }}
                >
                  Copy Address
                </ActionLink>

                {transaction.renBtcAddress && (
                  <div className={classes.qrCode}>
                    <QRCode size={116} value={transaction.renBtcAddress} />
                  </div>
                )}

                <Button
                  variant="outlined"
                  size="large"
                  fullWidth={true}
                  className={classNames(classes.cancelButton)}
                  onClick={goBack}
                >
                  Close
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Fade>
    </Modal>
  ) : (
    <div></div>
  );
};

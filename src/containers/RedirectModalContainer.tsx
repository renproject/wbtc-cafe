import { Link, makeStyles } from "@material-ui/core";
import Backdrop from "@material-ui/core/Backdrop";
import Button from "@material-ui/core/Button";
import Fade from "@material-ui/core/Fade";
import Dialog from "@material-ui/core/Dialog";
import Typography from "@material-ui/core/Typography";
import React, { MouseEventHandler, useCallback, useState } from "react";
import { ActionLink } from "../components/ActionLink";

const useStyles = makeStyles((theme) => ({
  modalContent: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    width: 360,
    padding: "16px 20px 24px",
    [theme.breakpoints.up("sm")]: {
      minHeight: 340,
    },
  },
  title: {
    fontWeight: "bold",
  },
}));

const badgerUrl = "https://app.badger.finance/bridge";

export const RedirectModalContainer: React.FC = () => {
  const classes = useStyles();
  const [opened, setOpened] = useState(true);

  const handleClose = useCallback((event: any) => {
    setOpened(false);
    if (event && event.preventDefault) {
      event.preventDefault();
    }
  }, []);

  return (
    <Dialog
      aria-labelledby="transition-modal-title"
      aria-describedby="transition-modal-description"
      open={opened}
      onClose={handleClose}
      closeAfterTransition
      PaperProps={{ elevation: 0, square: true }}
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
      }}
      disableBackdropClick
      disableEscapeKeyDown
    >
      <Fade in={opened}>
        <div className={classes.modalContent}>
          <div>
            <Typography variant="subtitle1" paragraph className={classes.title}>
              Notice
            </Typography>
            <Typography variant="caption" paragraph>
              Wbtc.cafe has migrated to Badger Bridge. Please follow the link to
              begin new transactions.
            </Typography>
            <Typography variant="caption" paragraph>
              <ActionLink href={badgerUrl}>{badgerUrl}</ActionLink>
            </Typography>
          </div>

          <div>
            <Typography variant="caption" paragraph>
              If you have existing transactions, view the legacy interface.
            </Typography>
            <Typography variant="caption">
              <ActionLink href="#" onClick={handleClose}>
                Continue to wbtc.cafe
              </ActionLink>
            </Typography>
          </div>
        </div>
      </Fade>
    </Dialog>
  );
};

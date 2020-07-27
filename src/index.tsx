import React from "react";
import ReactDOM from "react-dom";
import { ThemeProvider } from "@material-ui/core";

import { App } from "./App";
import { Web3Store } from "./hooks/useWeb3";
import "./index.css";
import * as serviceWorker from "./serviceWorker";
import { Store } from "./store/store";
import { theme } from "./theme/theme";
import { TransactionStore } from "./utils/txUtils";

ReactDOM.render(
  <Store.Provider>
    <TransactionStore.Provider>
      <Web3Store.Provider>
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>
      </Web3Store.Provider>
    </TransactionStore.Provider>
  </Store.Provider>,
  document.getElementById("root"),
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

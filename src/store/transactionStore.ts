import { createContainer } from "unstated-next";
import { List } from "immutable";
import { useCallback } from "react";
import { useTransactionLifecycle } from "../hooks/useTransactionLifecycle";

import { Transaction } from "../types/transaction";
import { Store } from "./store";

// should be moved to a global config
const storeString = "convert.transactions";

function useTransactionStore() {
  const {
    db,
    fsEnabled,
    localWeb3Address,
    fsSignature,

    convertTransactions,

    setConvertTransactions,
  } = Store.useContainer();

  // Changing TX State

  // Add a new Transaction to the convertTransactions list
  // will refuse to update an already existing transaction
  const addTx = useCallback(
    (tx: Transaction) => {
      let txs = convertTransactions;
      if (txs.find((x) => x.id === tx.id)) {
        return;
        // return updateTx(tx);
      }
      const timestamp = new Date().getTime();
      txs = txs.push({ ...tx, txCreatedAt: timestamp, txUpdatedAt: timestamp });
      setConvertTransactions(List(txs.toArray()));

      // use localStorage
      localStorage.setItem(storeString, JSON.stringify(txs));

      if (fsEnabled) {
        try {
          db.addTx(tx, localWeb3Address, fsSignature).catch(console.error);
        } catch (e) {
          console.error(e);
        }
      }
    },
    [
      convertTransactions,
      db,
      fsEnabled,
      fsSignature,
      localWeb3Address,
      setConvertTransactions,
    ]
  );

  // Replace an already existing transaction
  const updateTx = useCallback(
    (newTx: Transaction): Transaction => {
      const txs = convertTransactions.map((t) => {
        if (t.id === newTx.id) {
          return { ...newTx, txUpdatedAt: new Date().getTime() };
        }
        return t;
      });
      // setConvertTransactions(List(txs.toArray()));

      // use localStorage
      localStorage.setItem(storeString, JSON.stringify(txs));

      if (fsEnabled) {
        try {
          db.updateTx(newTx).catch(console.error);
        } catch (e) {
          console.error(e);
        }
      }

      return newTx;
    },
    [convertTransactions, db, fsEnabled, setConvertTransactions]
  );

  // Remove an existing transaction
  const removeTx = useCallback(
    async (tx: Transaction) => {
      console.log("removing tx");
      const txs = convertTransactions.filter((t) => t.id !== tx.id);
      setConvertTransactions(List(txs.toArray()));

      // Use localStorage
      localStorage.setItem(storeString, JSON.stringify(txs));

      if (fsEnabled) {
        try {
          await db.deleteTx(tx).catch(console.error);
        } catch (e) {
          console.error(e);
        }
      }
    },
    [db, fsEnabled, convertTransactions, setConvertTransactions]
  );

  const getTx = useCallback(
    (id: Transaction["id"]) => {
      return convertTransactions.filter((t) => t.id === id).first(null);
    },
    [convertTransactions]
  );

  const txExists = useCallback(
    (tx: Transaction) => {
      return convertTransactions.filter((t) => t.id === tx.id).size > 0;
    },
    [convertTransactions]
  );

  // delete all txs, locally and remotely
  const nuke = useCallback(async () => {
    localStorage.setItem("nuking", "true");

    const deleted: string[] = [];
    // Promise.all(convertTransactions.map(removeTx));
    for (const tx of convertTransactions) {
      if (fsEnabled) {
        try {
          await db.deleteTx(tx).catch(console.error);
          deleted.push(tx.id);
        } catch (e) {
          console.error(e);
        }
        // It's fine if we delete items remotely that still exist locally
        localStorage.setItem(
          storeString,
          JSON.stringify(
            convertTransactions.filter((x) => !deleted.includes(x.id))
          )
        );
      } else {
        localStorage.removeItem(storeString);
      }
    }
    localStorage.removeItem("nuking");
  }, [db, convertTransactions, fsEnabled]);

  const {
    completeConvertToEthereum,
    initConvertToEthereum,
    // initConvertFromEthereum,
    // initMonitoringTrigger,
  } = useTransactionLifecycle(addTx, getTx, updateTx, txExists);

  return {
    nuke,
    updateTx,
    removeTx,
    completeConvertToEthereum,
    initConvertToEthereum,
    addTx,
    // initConvertFromEthereum,
    // initMonitoringTrigger,
  };
}

export const TransactionStore = createContainer(useTransactionStore);

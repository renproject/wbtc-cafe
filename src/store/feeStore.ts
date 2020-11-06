import { AbiItem } from "web3-utils";
import { useCallback, useEffect, useState } from "react";
import curveABI from "../utils/ABIs/curveABI.json";
import { CURVE_MAIN, CURVE_TEST } from "../utils/environmentVariables";
import { Store } from "./store";
import { Asset } from "../utils/assets";
import RenJS from "@renproject/ren";
import { Transaction } from "../types/transaction";
import { createContainer } from "unstated-next";
import { RenVMFees } from "@renproject/interfaces";
import { Bitcoin } from "@renproject/chains-bitcoin";

export function useFeesStore() {
  const {
    fees,
    convertAmount,
    convertSelectedDirection,
    dataWeb3,
    selectedNetwork,

    setConvertExchangeRate,
    setConvertRenVMFee,
    setConvertNetworkFee,
    setConvertConversionTotal,
    sdk,

    setFees,
  } = Store.useContainer();

  // External Data
  const updateRenVMFees = useCallback(async () => {
    try {
      const data = await sdk?.getFees();
      if (data) {
        setFees(data);
        return data;
      } else {
        throw Error("no fee data");
      }
    } catch (e) {
      console.error(e);
    }
  }, [setFees, sdk]);

  const gatherFeeData = useCallback(
    async (directAmount?: number) => {
      let currentFees = fees;
      if (!fees) {
        currentFees = await updateRenVMFees();
      }
      const amount = directAmount || convertAmount;
      const selectedDirection = convertSelectedDirection;
      const fixedFeeKey = selectedDirection ? "release" : "lock";
      const dynamicFeeKey = selectedDirection ? "burn" : "mint";

      const fixedFee = Number(currentFees![Asset.BTC][fixedFeeKey] / 10 ** 8);
      const dynamicFeeRate = Number(
        currentFees![Asset.BTC].ethereum[dynamicFeeKey] / 10000
      );

      if (!amount || !dataWeb3 || !currentFees) return;

      try {
        let exchangeRate: number;
        let renVMFee: number;
        let total: number | string;
        const amountInSats = Math.round(
          Number(amount) *
            10 ** Bitcoin().assetDecimals(Asset.BTC.toUpperCase())
        );
        const curve = new dataWeb3.eth.Contract(
          curveABI as AbiItem[],
          selectedNetwork === "testnet" ? CURVE_TEST : CURVE_MAIN
        );

        // withdraw
        if (selectedDirection) {
          const swapResult =
            (await curve.methods.get_dy(1, 0, amountInSats).call()) / 10 ** 8;
          exchangeRate = Number(swapResult / Number(amount));
          renVMFee = Number(swapResult) * dynamicFeeRate;
          total =
            Number(swapResult - renVMFee - fixedFee) > 0
              ? Number(swapResult - renVMFee - fixedFee)
              : "0.000000";
        } else {
          renVMFee = Number(amount) * dynamicFeeRate;
          const amountAfterMint =
            Number(Number(amount) - renVMFee - fixedFee) > 0
              ? Number(Number(amount) - renVMFee - fixedFee)
              : 0;
          const amountAfterMintInSats = Math.round(
            Number(amountAfterMint) *
              10 ** Bitcoin().assetDecimals(Asset.BTC.toUpperCase())
          );

          if (amountAfterMintInSats) {
            const swapResult =
              (await curve.methods.get_dy(0, 1, amountAfterMintInSats).call()) /
              10 ** 8;
            exchangeRate = Number(swapResult / amountAfterMint);
            total = Number(swapResult);
          } else {
            exchangeRate = Number(0);
            total = Number(0);
          }
        }

        setConvertExchangeRate(exchangeRate);
        setConvertRenVMFee(renVMFee);
        setConvertNetworkFee(fixedFee);
        setConvertConversionTotal(total);
        return {
          exchangeRate,
          renVMFee,
          fixedFee,
          total,
        };
      } catch (e) {
        console.error(e);
      }
    },
    [
      convertAmount,
      convertSelectedDirection,
      fees,
      dataWeb3,
      selectedNetwork,
      setConvertExchangeRate,
      setConvertRenVMFee,
      setConvertNetworkFee,
      setConvertConversionTotal,
    ]
  );

  const getFinalDepositExchangeRate = useCallback(
    async (tx: Transaction) => {
      const { renResponse } = tx;

      const utxoAmountInSats = Number(renResponse.out.amount);
      const dynamicFeeRate = Number(fees![Asset.BTC].ethereum["mint"] / 10000);
      const finalAmount = Math.round(utxoAmountInSats * (1 - dynamicFeeRate));

      const curve = new dataWeb3!.eth.Contract(
        curveABI as AbiItem[],
        selectedNetwork === "testnet" ? CURVE_TEST : CURVE_MAIN
      );
      try {
        const swapResult = await curve.methods.get_dy(0, 1, finalAmount).call();
        return Number(swapResult / finalAmount);
      } catch (e) {
        console.error(e);
      }
    },
    [dataWeb3, fees, selectedNetwork]
  );

  return {
    getFinalDepositExchangeRate,
    updateRenVMFees,
    gatherFeeData,
  };
}

export const FeeStore = createContainer(useFeesStore);

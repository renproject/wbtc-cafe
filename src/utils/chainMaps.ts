import {
  GatewayMachineContext,
  BurnMachineContext,
  GatewaySession,
} from "@renproject/rentx";
import { Ethereum } from "@renproject/chains-ethereum";
import { Bitcoin } from "@renproject/chains-bitcoin";

export interface CustomParams {
  maxSlippage: number;
  minExchangeRate: number;
  minSwapProceeds: number;
  adapterAddress: string;
  params: {
    nonce: string;
  };
}

export const mintChainMap: GatewayMachineContext["toChainMap"] = {
  ethereum: (context) => {
    const {
      sourceAsset,
      destAddress,
      destNetwork,
      userAddress,
      customParams,
    } = context.tx as GatewaySession<CustomParams>;
    const { providers } = context;

    return Ethereum(providers[destNetwork]).Contract({
      sendTo: customParams?.adapterAddress || "",
      contractFn: "mintThenSwap",
      contractParams: [
        {
          name: "_minExchangeRate",
          type: "uint256",
          value: Number(
            customParams?.minExchangeRate! *
              10 ** Bitcoin().assetDecimals(sourceAsset.toUpperCase())
          ).toFixed(0),
        },
        {
          name: "_newMinExchangeRate",
          type: "uint256",
          value: Number(
            customParams?.minExchangeRate! *
              10 ** Bitcoin().assetDecimals(sourceAsset.toUpperCase())
          ).toFixed(0),
        },
        {
          name: "_slippage",
          type: "uint256",
          value: Number(customParams?.maxSlippage! * 10000).toFixed(0),
        },
        {
          name: "_wbtcDestination",
          type: "address",
          value: destAddress,
        },
        {
          name: "_msgSender",
          type: "address",
          value: userAddress,
        },
      ],
    }) as any;
  },
};

export const lockChainMap = {
  bitcoin: () => Bitcoin(),
};

export const burnChainMap: BurnMachineContext["fromChainMap"] = {
  ethereum: (context) => {
    const {
      destAddress,
      targetAmount,
      customParams,
    } = context.tx as GatewaySession<CustomParams>;

    const { providers } = context;
    return Ethereum(providers.ethereum).Contract({
      sendTo: customParams?.adapterAddress || "",
      contractFn: "swapThenBurn",
      contractParams: [
        {
          name: "_btcDestination",
          type: "address",
          value: destAddress,
        },
        {
          name: "_amount",
          value: targetAmount,
          type: "uint256",
        },
        {
          name: "_minRenbtcAmount",
          value: customParams?.minSwapProceeds,
          type: "uint256",
        },
      ],
    }) as any;
  },
};

export const releaseChainMap: BurnMachineContext["toChainMap"] = {
  bitcoin: (context) => {
    return Bitcoin().Address(context.tx.destAddress) as any;
  },
};

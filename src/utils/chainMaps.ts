import {
  GatewayMachineContext,
  BurnMachineContext,
  GatewaySession,
} from "@renproject/ren-tx";
import { Ethereum, Bitcoin } from "@renproject/chains";

export interface CustomParams {
  maxSlippage: number;
  minExchangeRate: number;
  minSwapProceeds: number;
  adapterAddress: string;
  destAsset: "BTC" | "WBTC";
  params: {
    nonce: string;
  };
}

export const mintChainMap: GatewayMachineContext["toChainMap"] = {
  ethereum: (context) => {
    const {
      sourceAsset,
      destAddress,
      destChain,
      userAddress,
      network,
      customParams,
    } = context.tx as GatewaySession<CustomParams>;
    const { providers } = context;

    const to = Ethereum(providers[destChain], network).Contract({
      sendTo: customParams.adapterAddress,
      contractFn: "mintThenSwap",
      contractParams: [
        {
          name: "_minExchangeRate",
          type: "uint256",
          value: Number(
            customParams.minExchangeRate *
              10 ** Bitcoin().assetDecimals(sourceAsset.toUpperCase())
          ).toFixed(0),
        },
        {
          name: "_newMinExchangeRate",
          type: "uint256",
          value: Number(
            customParams.minExchangeRate *
              10 ** Bitcoin().assetDecimals(sourceAsset.toUpperCase())
          ).toFixed(0),
          notInPayload: true,
        },
        {
          name: "_slippage",
          type: "uint256",
          value: Number(customParams.maxSlippage * 10000).toFixed(0),
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
          onlyInPayload: true,
        },
      ],
    });
    console.log(to);
    return to;
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
    });
  },
};

export const releaseChainMap: BurnMachineContext["toChainMap"] = {
  bitcoin: (context) => {
    return Bitcoin().Address(context.tx.destAddress);
  },
};

jest.genMockFromModule("expo-ads-admob");
import { AdMobInterstitial } from "expo-ads-admob";

export const mockAdMobInterstitial = () => {
  AdMobInterstitial.addEventListener("interstitialDidClose", () => {
    onFinishShowingAd();
  });

  return {
    getInterstitialDidCloseCallback: (() => {
      let capturedCallback = null;
      jest
        .spyOn(AdMobInterstitial, "addEventListener")
        .mockImplementation((eventName, callback) => {
          if (eventName === "interstitialDidClose") capturedCallback = callback;
        });
      return () => capturedCallback;
    })(),
    setAdUnitID: jest
      .spyOn(AdMobInterstitial, "setAdUnitID")
      .mockResolvedValue(undefined),
    requestAdAsync: jest
      .spyOn(AdMobInterstitial, "requestAdAsync")
      .mockResolvedValue(undefined),
    getIsReadyAsync: jest
      .spyOn(AdMobInterstitial, "getIsReadyAsync")
      .mockResolvedValue(true),
    showAdAsync: jest
      .spyOn(AdMobInterstitial, "showAdAsync")
      .mockResolvedValue(undefined),
  };
};

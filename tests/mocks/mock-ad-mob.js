jest.genMockFromModule("expo-ads-admob");
import { AdMobInterstitial, AdMobRewarded } from "expo-ads-admob";

export const mockAdMobInterstitial = () => {
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

export const mockAdMobRewarded = () => {
  return {
    getRewardAdDidCloseCallback: (() => {
      let capturedCallback = null;
      jest
        .spyOn(AdMobRewarded, "addEventListener")
        .mockImplementation((eventName, callback) => {
          if (eventName === "rewardedVideoDidDismiss")
            capturedCallback = callback;
        });
      return () => capturedCallback;
    })(),
    getEarnRewardCallback: (() => {
      let capturedCallback = null;
      jest
        .spyOn(AdMobRewarded, "addEventListener")
        .mockImplementation((eventName, callback) => {
          if (eventName === "rewardedVideoUserDidEarnReward")
            capturedCallback = callback;
        });
      return () => capturedCallback;
    })(),
    setAdUnitID: jest
      .spyOn(AdMobRewarded, "setAdUnitID")
      .mockResolvedValue(undefined),
    requestAdAsync: jest
      .spyOn(AdMobRewarded, "requestAdAsync")
      .mockResolvedValue(undefined),
    getIsReadyAsync: jest
      .spyOn(AdMobRewarded, "getIsReadyAsync")
      .mockResolvedValue(false),
    showAdAsync: jest
      .spyOn(AdMobRewarded, "showAdAsync")
      .mockResolvedValue(undefined),
  };
};

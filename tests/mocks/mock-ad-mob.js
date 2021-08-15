jest.genMockFromModule("expo-ads-admob");
import { AdMobInterstitial } from "expo-ads-admob";

export const mockAdMobInterstitial = () => ({
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
});

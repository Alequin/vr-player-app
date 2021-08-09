import { AdMobBanner, AdMobRewarded } from "expo-ads-admob";
import React from "react";

const isEnvProduction = process.env.NODE_ENV === "production";

export const AdBanner = ({ adUnitID }) => {
  return (
    <AdMobBanner
      style={{ width: "100%", backgroundColor: "red" }}
      adUnitID={
        isEnvProduction ? adUnitID : "ca-app-pub-3940256099942544/6300978111"
      }
    />
  );
};

const loadRewardAd = async () => {
  if (!(await AdMobRewarded.getIsReadyAsync()))
    await AdMobRewarded.requestAdAsync();
};

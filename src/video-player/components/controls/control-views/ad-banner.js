import { AdMobBanner } from "expo-ads-admob";
import React from "react";
import { isEnvironmentProduction } from "../../../../is-environment-production";
import { bannerAdId } from "../../../../../secrets.json";

export const AdBanner = () => {
  return (
    <AdMobBanner
      adUnitID={
        isEnvironmentProduction()
          ? bannerAdId
          : "ca-app-pub-3940256099942544/6300978111"
      }
    />
  );
};

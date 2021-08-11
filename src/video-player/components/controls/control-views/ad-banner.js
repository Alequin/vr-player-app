import { AdMobBanner } from "expo-ads-admob";
import React from "react";
import { isEnvironmentProduction } from "../../../../is-environment-production";

export const AdBanner = ({ adUnitID }) => {
  return (
    <AdMobBanner
      adUnitID={
        isEnvironmentProduction()
          ? adUnitID
          : "ca-app-pub-3940256099942544/6300978111"
      }
    />
  );
};

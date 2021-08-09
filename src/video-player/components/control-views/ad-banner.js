import { AdMobBanner } from "expo-ads-admob";
import React from "react";

const isEnvProduction = process.env.NODE_ENV === "production";

export const AdBanner = ({ adUnitID }) => {
  return (
    <AdMobBanner
      style={{ width: "100%" }}
      adUnitID={
        isEnvProduction ? adUnitID : "ca-app-pub-3940256099942544/6300978111"
      }
    />
  );
};

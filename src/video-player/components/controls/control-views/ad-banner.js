import { AdMobBanner } from "expo-ads-admob";
import React from "react";
import { View } from "react-native";
import { bannerAdId } from "../../../../../secrets.json";
import { isEnvironmentProduction } from "../../../../environment";

export const AdBanner = () => {
  //Wrapped in a view in order to add a test ID
  return (
    <View testID="bannerAd">
      <AdMobBanner
        adUnitID={
          isEnvironmentProduction()
            ? bannerAdId
            : "ca-app-pub-3940256099942544/6300978111"
        }
      />
    </View>
  );
};

import { AdMobRewarded } from "expo-ads-admob";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { disableAdsRewardId } from "../../../../../secrets.json";
import { Button } from "../../../../button";
import { isEnvironmentProduction } from "../../../../environment";
import { disableAds, timeAdsAreDisabledFor } from "../../../ads-disable-time";
import { ControlPageIcon } from "../../control-page-icon";
import { millisecondsToTime } from "../../utils";
import { ControlViewText } from "./control-view-text";

export const DisableAdsView = ({
  onPressSelectVideo,
  onDisableAds,
  areAdsDisabled,
}) => {
  const [adsDisabledTime, setAdsDisabledTime] = useState(0);

  useEffect(() => {
    AdMobRewarded.setAdUnitID(
      isEnvironmentProduction()
        ? disableAdsRewardId
        : "ca-app-pub-3940256099942544/5224354917"
    ).then(async () => {
      timeAdsAreDisabledFor().then(setAdsDisabledTime);

      AdMobRewarded.addEventListener(
        "rewardedVideoUserDidEarnReward",
        async () => {
          await disableAds();
          onDisableAds();
        }
      );
      AdMobRewarded.addEventListener("rewardedVideoDidDismiss", async () =>
        loadRewardAd()
      );
    });

    return () => AdMobRewarded.removeAllListeners();
  }, []);

  useEffect(() => {
    if (areAdsDisabled) {
      const interval = setInterval(() => {
        setAdsDisabledTime((previousTime) => previousTime - 1000);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [areAdsDisabled]);

  return (
    <View
      testID="disableAdsView"
      style={{
        flex: 1,
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          justifyContent: "space-around",
        }}
      >
        <Button
          style={{
            alignItems: "center",
            margin: 20,
            width: "40%",
            height: "100%",
          }}
          onPress={async () => {
            await loadRewardAd();
            await AdMobRewarded.showAdAsync();
          }}
        >
          <ControlPageIcon name="hourglass" size={38} />
          {areAdsDisabled ? (
            <ControlViewText>
              Ads are already disabled. Add more time by watching another short
              ad
            </ControlViewText>
          ) : (
            <ControlViewText>
              Watch a short ad and disable all other ads for 20 minutes
            </ControlViewText>
          )}

          {areAdsDisabled && (
            <View
              style={{
                flex: 1,
                width: "100%",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ControlViewText>
                {`Ads are still disabled for ${millisecondsToTime(
                  adsDisabledTime
                )}`}
              </ControlViewText>
            </View>
          )}
        </Button>
        <Button
          style={{
            alignItems: "center",
            margin: 20,
            width: "40%",
            height: "100%",
          }}
          onPress={onPressSelectVideo}
        >
          <ControlPageIcon name="googlePlay" size={38} />
          <ControlViewText>
            Buy the ad-free version of the app and help support us
          </ControlViewText>
        </Button>
      </View>
    </View>
  );
};

const loadRewardAd = async () => {
  const isAdLoaded = await AdMobRewarded.getIsReadyAsync();
  if (!isAdLoaded) await AdMobRewarded.requestAdAsync();
};

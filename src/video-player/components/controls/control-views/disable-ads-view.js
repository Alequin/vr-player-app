import { AdMobRewarded } from "expo-ads-admob";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { disableAdsRewardId } from "../../../../../secrets.json";
import { Button } from "../../../../button";
import { isEnvironmentProduction } from "../../../../environment";
import { isAtLeastAnHour } from "../../../../is-at-least-an-hour";
import { logError } from "../../../../logger";
import { disableAds, timeAdsAreDisabledFor } from "../../../ads-disable-time";
import { ControlPageIcon } from "../../control-page-icon";
import {
  millisecondsToTime,
  millisecondsToTimeWithoutHours,
} from "../../utils";
import { ControlViewText } from "./control-view-text";

export const DisableAdsView = ({ onDisableAds }) => {
  const [adsDisabledTime, setAdsDisabledTime] = useState(0);

  const areAdsDisabled = adsDisabledTime > 0;

  useEffect(() => {
    AdMobRewarded.setAdUnitID(
      isEnvironmentProduction()
        ? disableAdsRewardId
        : "ca-app-pub-3940256099942544/5224354917"
    );
  }, []);

  useEffect(() => {
    timeAdsAreDisabledFor().then(setAdsDisabledTime);
  }, []);

  const showFailedRewardAdAlert = useFailedRewardAdAlert(
    areAdsDisabled,
    setAdsDisabledTime,
    onDisableAds
  );

  useEffect(() => {
    AdMobRewarded.addEventListener(
      "rewardedVideoUserDidEarnReward",
      async () => {
        await disableAds({ minutesToDisableFor: 20 });
        setAdsDisabledTime(await timeAdsAreDisabledFor());
        onDisableAds();
      }
    );

    AdMobRewarded.addEventListener("rewardedVideoDidDismiss", async () =>
      loadRewardAd()
    );

    return () => AdMobRewarded.removeAllListeners();
  }, [showFailedRewardAdAlert]);

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
            try {
              await loadRewardAd();
              await AdMobRewarded.showAdAsync();
            } catch (error) {
              logError(error);
              showFailedRewardAdAlert();
            }
          }}
        >
          <ControlPageIcon name="hourglass" />
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
                {`Ads are disabled for ${
                  isAtLeastAnHour(adsDisabledTime)
                    ? millisecondsToTime(adsDisabledTime)
                    : millisecondsToTimeWithoutHours(adsDisabledTime)
                }`}
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
        >
          <ControlPageIcon name="googlePlay" />
          <ControlViewText>Buy the ad-free version of the app</ControlViewText>
        </Button>
      </View>
    </View>
  );
};

const loadRewardAd = async () => {
  const isAdLoaded = await AdMobRewarded.getIsReadyAsync();
  if (!isAdLoaded) await AdMobRewarded.requestAdAsync();
};

const useFailedRewardAdAlert = (
  areAdsDisabled,
  setAdsDisabledTime,
  onDisableAds
) => {
  return useCallback(() => {
    const disableAdsMessage = areAdsDisabled
      ? "Ads are already disabled but more time can be added next time an advert can be shown"
      : "All other ads will be disabled for 2 minutes";

    return Alert.alert(
      "Unable to load advert",
      `Sorry, we had trouble loading an advert to show.\n\n${disableAdsMessage}.\n\nTry again later`,
      [
        {
          text: "OK",
          onPress: async () => {
            onDisableAds();
            await disableAds({
              minutesToDisableFor: 2,
              wasDisabledDueToError: true,
            });
            setAdsDisabledTime(await timeAdsAreDisabledFor());
          },
        },
      ],
      { cancelable: false }
    );
  }, [areAdsDisabled, setAdsDisabledTime]);
};

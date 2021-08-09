import { AdMobRewarded } from "expo-ads-admob";
import React, { useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { disableAdsRewardId } from "../../../../secrets.json";
import { disableAds } from "../../ads";
import { ControlPageIcon } from "../control-page-icon";
import { ControlViewText } from "./control-view-text";

export const DisableAdsView = ({ onPressSelectVideo, onDisableAds }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AdMobRewarded.setAdUnitID(disableAdsRewardId).then(async () => {
      await loadRewardAd();

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

      setIsLoading(false);
    });

    return () => AdMobRewarded.removeAllListeners();
  }, []);

  if (isLoading) return null;

  return (
    <View
      style={{
        flex: 1,
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          style={{ alignItems: "center", margin: 20, width: "30%" }}
          onPress={async () => {
            await loadRewardAd();
            await AdMobRewarded.showAdAsync();
          }}
        >
          <ControlPageIcon name="cancel" size={38} />
          <ControlViewText>
            Watch a short ad now and disable all other ads for 20 minutes
          </ControlViewText>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ alignItems: "center", margin: 20, width: "30%" }}
          onPress={onPressSelectVideo}
        >
          <ControlPageIcon name="folderVideo" size={38} />
          <ControlViewText>
            Buy the ad-free version of the app and help support us
          </ControlViewText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const loadRewardAd = async () => {
  const isAdLoaded = await AdMobRewarded.getIsReadyAsync();
  if (!isAdLoaded) await AdMobRewarded.requestAdAsync();
};

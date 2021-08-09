import { AdMobRewarded } from "expo-ads-admob";
import React, { useEffect } from "react";
import { TouchableOpacity, View } from "react-native";
import {
  disableAdsRewardId,
  homeViewAdBannerId,
} from "../../../../secrets.json";
import { ControlPageIcon } from "../control-page-icon";
import { AdBanner } from "./ad-banner";
import { ControlViewText } from "./control-view-text";

export const HomeView = ({ onPressSelectVideo }) => {
  useEffect(() => {
    AdMobRewarded.setAdUnitID(disableAdsRewardId).then(async () => {
      await loadRewardAd();

      AdMobRewarded.addEventListener(
        "rewardedVideoUserDidEarnReward",
        async () => {
          console.log("ads are now disabled");
        }
      );
      AdMobRewarded.addEventListener("rewardedVideoDidDismiss", async () => {
        await loadRewardAd();
        console.log("reward ad dismissed");
      });
    });

    return () => AdMobRewarded.removeAllListeners();
  }, []);

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
          onPress={onPressSelectVideo}
        >
          <ControlPageIcon name="folderVideo" size={38} />
          <ControlViewText>Select a video to watch</ControlViewText>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ alignItems: "center", margin: 20, width: "30%" }}
          onPress={async () => {
            await loadRewardAd();
            await AdMobRewarded.showAdAsync();
          }}
        >
          <ControlPageIcon name="cancel" size={38} />
          <ControlViewText>Disable ads</ControlViewText>
        </TouchableOpacity>
      </View>
      <AdBanner adUnitID={homeViewAdBannerId} />
    </View>
  );
};

const loadRewardAd = async () => {
  if (!(await AdMobRewarded.getIsReadyAsync()))
    await AdMobRewarded.requestAdAsync();
};

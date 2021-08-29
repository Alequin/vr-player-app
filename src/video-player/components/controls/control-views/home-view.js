import { AdMobRewarded } from "expo-ads-admob";
import React from "react";
import { View } from "react-native";
import { Button } from "../../../../button";
import { ControlPageIcon } from "../../control-page-icon";
import { ControlViewText } from "./control-view-text";
import { isPayedVersion } from "../../../../../secrets.json";

export const HomeView = ({ onPressSelectVideo, onPressDisableAds }) => {
  return (
    <View
      testID="homeView"
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
        <Button
          style={{
            alignItems: "center",
            justifyContent: "center",
            width: isPayedVersion ? "100%" : "50%",
          }}
          onPress={onPressSelectVideo}
        >
          <ControlPageIcon name="folderVideo" size={38} />
          <ControlViewText>Select a video to watch</ControlViewText>
        </Button>
        {!isPayedVersion && (
          <Button
            style={{
              alignItems: "center",
              justifyContent: "center",
              width: "50%",
            }}
            onPress={onPressDisableAds}
          >
            <ControlPageIcon name="cancel" size={38} />
            <ControlViewText>Disable ads</ControlViewText>
          </Button>
        )}
      </View>
    </View>
  );
};

const loadRewardAd = async () => {
  if (!(await AdMobRewarded.getIsReadyAsync()))
    await AdMobRewarded.requestAdAsync();
};

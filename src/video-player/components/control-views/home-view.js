import { AdMobBanner, PublisherBanner } from "expo-ads-admob";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { ControlPageIcon } from "../control-page-icon";
import { ControlViewText } from "./control-view-text";
import { homeViewAdBannerId } from "../../../../secrets.json";

export const HomeView = ({ onPressSelectVideo }) => {
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
        >
          <ControlPageIcon name="cancel" size={38} />
          <ControlViewText>Disable ads</ControlViewText>
        </TouchableOpacity>
      </View>
      <AdMobBanner style={{ width: "100%" }} adUnitID={homeViewAdBannerId} />
    </View>
  );
};

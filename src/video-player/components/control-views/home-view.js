import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ControlPageIcon } from "../control-page-icon";
import { ControlViewText } from "./control-view-text";

export const HomeView = ({ onPressBack, onPressSelectVideo }) => {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
      }}
      onPress={onPressBack}
    >
      <TouchableOpacity
        style={{ alignItems: "center", margin: 20, width: "50%" }}
        onPress={onPressSelectVideo}
      >
        <ControlPageIcon name="folderVideo" size={38} />
        <ControlViewText>Select a video to watch</ControlViewText>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ alignItems: "center", margin: 20, width: "50%" }}
      >
        <ControlPageIcon name="cancel" size={38} />
        <ControlViewText>Disable ads</ControlViewText>
      </TouchableOpacity>
    </View>
  );
};

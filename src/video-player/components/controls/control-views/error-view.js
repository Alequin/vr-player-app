import React from "react";
import { TouchableOpacity, View } from "react-native";
import { ControlPageIcon } from "../../control-page-icon";
import { ControlViewText } from "./control-view-text";

export const ErrorView = ({
  onPressBack,
  errorMessage,
  onPressSelectAnotherVideo,
}) => {
  return (
    <View
      testID="errorView"
      style={{
        flex: 1,
        justifyContent: "flex-end",
      }}
      onPress={onPressBack}
    >
      <View
        style={{
          height: "80%",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ControlPageIcon name="warningOutline" color="#A5402D" size={26} />
        <ControlViewText>
          Sorry, there was an issue playing the video
        </ControlViewText>
        <ControlViewText>{errorMessage}</ControlViewText>
        <TouchableOpacity
          style={{ alignItems: "center", margin: 20 }}
          onPress={onPressSelectAnotherVideo}
        >
          <ControlPageIcon name="folderVideo" />
          <ControlViewText>Open a different video</ControlViewText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

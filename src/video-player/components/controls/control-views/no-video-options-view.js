import React from "react";
import { SingleButtonView } from "./single-button-view";

export const NoVideoOptionsView = ({ onPressReloadVideoOptions }) => {
  return (
    <SingleButtonView
      testID="noVideoOptionsView"
      onPress={onPressReloadVideoOptions}
      bodyText={
        "Cannot find any videos to play.\n\nMove some onto your device to watch them in VR."
      }
      iconName="refresh"
      iconText="Reload video files"
    />
  );
};

import React from "react";
import { SingleButtonView } from "./single-button-view";

export const ErrorLoadingVideoOptionsView = ({ onPressReloadVideoOptions }) => {
  return (
    <SingleButtonView
      testID="errorLoadingVideoOptionsView"
      onPress={onPressReloadVideoOptions}
      bodyText={
        "Sorry, there was an issue while looking for videos to play.\n\nReload to try again."
      }
      iconName="refresh"
      iconText="Reload video files"
    />
  );
};

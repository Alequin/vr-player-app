import React from "react";
import { SingleButtonView } from "./single-button-view";

export const ErrorPlayingVideoView = ({
  errorMessage,
  onPressSelectAnotherVideo,
}) => {
  return (
    <SingleButtonView
      testID="errorPlayingVideoView"
      onPress={onPressSelectAnotherVideo}
      bodyText={`Sorry, there was an issue playing the video.\n\n${errorMessage}`}
      iconName="folderVideo"
      iconText="Open a different video"
    />
  );
};

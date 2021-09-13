import React from "react";
import { SingleButtonView } from "./single-button-view";

export const ErrorView = ({ errorMessage, onPressSelectAnotherVideo }) => {
  return (
    <SingleButtonView
      testID="errorView"
      onPress={onPressSelectAnotherVideo}
      bodyText={`Sorry, there was an issue playing the video.\n\n${errorMessage}`}
      iconName="folderVideo"
      iconText="Open a different video"
    />
  );
};

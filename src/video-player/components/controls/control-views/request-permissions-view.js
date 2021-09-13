import React from "react";
import { SingleButtonView } from "./single-button-view";

export const RequestPermissionsView = ({
  onPress,
  shouldDirectUserToSettings,
}) => {
  return (
    <SingleButtonView
      testID="requestPermissionsView"
      onPress={onPress}
      bodyText={`You will need to grant the app permission to view media files\n\nbefore you can select videos to watch.`}
      iconName="shieldKey"
      iconText={
        shouldDirectUserToSettings
          ? "Press to view the settings page and update permissions"
          : "Press to give permission to access media files"
      }
    />
  );
};

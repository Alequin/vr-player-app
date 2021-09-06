import React from "react";
import { View } from "react-native";
import { Button } from "../../../../../button";
import { ControlPageIcon } from "../../../control-page-icon";
import { ControlViewText } from "../control-view-text";

export const RequestPermissionsButton = ({
  testID,
  onPress,
  shouldDirectUserToSettings,
}) => {
  return (
    <View
      testID={testID}
      style={{
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Button
        style={{
          alignItems: "center",
          justifyContent: "center",
        }}
        onPress={onPress}
      >
        <ControlViewText>
          You will need to grant the app permission to view media files
        </ControlViewText>
        <ControlViewText>before a video can be selected</ControlViewText>
        <ControlPageIcon
          name="shieldKey"
          size={38}
          style={{ marginVertical: 10 }}
        />
        <ControlViewText style={{ fontWeight: "bold" }}>
          {shouldDirectUserToSettings
            ? "Press to view the settings page and update permissions"
            : "Press to give permission to access media files"}
        </ControlViewText>
      </Button>
    </View>
  );
};

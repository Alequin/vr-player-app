import React from "react";
import { View } from "react-native";
import { Button } from "../../../../button";
import { ControlPageIcon } from "../../control-page-icon";
import { ControlViewText } from "./control-view-text";

export const SingleButtonView = ({
  testID,
  onPress,
  bodyText,
  iconName,
  iconText,
}) => {
  return (
    <View
      testID={testID}
      style={{
        flex: 1,
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
        <ControlViewText style={{ fontWeight: "bold" }}>
          {bodyText}
        </ControlViewText>
        <ControlPageIcon
          name={iconName}
          size={32}
          style={{ marginVertical: 10 }}
        />
        <ControlViewText style={{ fontWeight: "bold" }}>
          {iconText}
        </ControlViewText>
      </Button>
    </View>
  );
};

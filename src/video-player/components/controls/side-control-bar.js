import React from "react";
import { View } from "react-native";
import { Button } from "../../../button";

export const SideControlBar = ({
  testID,
  left,
  right,
  children,
  shouldDisableControls,
  onPress,
}) => (
  <View
    testID={testID}
    style={{
      opacity: shouldDisableControls ? 0.25 : 1,
      justifyContent: "center",
      height: "100%",
    }}
  >
    <Button
      style={{
        justifyContent: "center",
        height: "100%",
      }}
      onPress={onPress}
      disabled={shouldDisableControls}
    >
      <View
        style={{
          justifyContent: "center",
          backgroundColor: "#00000080",
          height: "50%",
          padding: 10,
          ...sideBarBorderRadius({ left, right }),
        }}
      >
        {children}
      </View>
    </Button>
  </View>
);

const sideBarBorderRadius = ({ left, right }) => {
  if (left) {
    return {
      borderTopRightRadius: 50,
      borderBottomRightRadius: 50,
    };
  }

  if (right) {
    return {
      borderTopLeftRadius: 50,
      borderBottomLeftRadius: 50,
    };
  }
};

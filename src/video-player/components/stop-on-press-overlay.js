import React from "react";
import { View } from "react-native";

export const StopOnPressOverlay = ({ zIndex }) => (
  <View
    style={{
      position: "absolute",
      height: "100%",
      width: "100%",
      zIndex,
    }}
  />
);

import React from "react";
import { View } from "react-native";

export const VideoPlayerMask = ({ zIndex, shouldMakeMaskTransparent }) => (
  <View
    style={{
      position: "absolute",
      height: "100%",
      width: "100%",
      zIndex,
      backgroundColor: shouldMakeMaskTransparent ? "transparent" : "orange",
    }}
  />
);
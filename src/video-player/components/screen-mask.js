import React from "react";
import { View } from "react-native";

export const VideoPlayerMask = ({ zIndex, isTransparent }) => (
  <View
    style={{
      position: "absolute",
      height: "100%",
      width: "100%",
      zIndex,
      backgroundColor: "black",
      opacity: isTransparent ? 0 : 1,
    }}
  />
);

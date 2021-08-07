import React from "react";
import { ImageBackground } from "react-native";

const backgroundImage = require("../../../assets/images/background.jpg");

export const VideoPlayerMask = ({ zIndex, shouldMakeMaskTransparent }) => (
  <ImageBackground
    source={backgroundImage}
    style={{
      position: "absolute",
      height: "100%",
      width: "100%",
      zIndex,
      opacity: shouldMakeMaskTransparent ? 0 : 1,
      backgroundColor: "orange",
      resizeMode: "cover",
    }}
  />
);

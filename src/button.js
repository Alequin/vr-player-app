import React from "react";
import { TouchableOpacity } from "react-native";
import { disabledElementOpacity } from "./video-player/disabld-element-opacity";

export const Button = ({ disabled, style, ...otherProps }) => (
  <TouchableOpacity
    accessibilityRole="button"
    disabled={disabled}
    {...otherProps}
    style={[{ opacity: disabledElementOpacity(disabled) }, style]}
  />
);

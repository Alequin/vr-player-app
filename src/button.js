import React from "react";
import { TouchableOpacity } from "react-native";

export const Button = ({ disabled, ...otherProps }) => (
  <TouchableOpacity
    testID={disabled ? "disabledButton" : "enabledButton"}
    accessibilityRole="button"
    disabled={disabled}
    {...otherProps}
  />
);

import React from "react";
import { TouchableOpacity } from "react-native";

export const Button = ({ disabled, ...otherProps }) => (
  <TouchableOpacity
    testID={disabled ? "disabledButton" : "button"}
    accessibilityRole="button"
    disabled={disabled}
    {...otherProps}
  />
);

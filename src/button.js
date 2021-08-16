import React from "react";
import { TouchableOpacity } from "react-native";

export const Button = ({ disabled, ...otherProps }) => (
  <TouchableOpacity
    accessibilityRole="button"
    disabled={disabled}
    {...otherProps}
  />
);

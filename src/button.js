import React from "react";
import { TouchableOpacity } from "react-native";

export const Button = ({ ...otherProps }) => (
  <TouchableOpacity accessibilityRole="button" {...otherProps} />
);

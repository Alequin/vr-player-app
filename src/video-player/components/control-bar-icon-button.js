import React from "react";
import { TouchableOpacity } from "react-native";
import { ControlPageIcon } from "./control-page-icon";

export const ControlBarIconButton = ({ onPress, name, disabled }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled}>
    <ControlPageIcon style={{ opacity: disabled ? 0.5 : 1 }} name={name} />
  </TouchableOpacity>
);

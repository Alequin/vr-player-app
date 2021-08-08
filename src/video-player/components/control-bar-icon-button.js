import React from "react";
import { TouchableOpacity } from "react-native";
import { ControlPageIcon } from "./control-page-icon";

export const ControlBarIconButton = ({ onPress, name }) => (
  <TouchableOpacity onPress={onPress}>
    <ControlPageIcon name={name} />
  </TouchableOpacity>
);

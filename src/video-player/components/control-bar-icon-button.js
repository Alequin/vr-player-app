import React from "react";
import { Button } from "../../button";
import { ControlPageIcon } from "./control-page-icon";

export const ControlBarIconButton = ({ onPress, name, size, disabled }) => (
  <Button onPress={onPress} disabled={disabled}>
    <ControlPageIcon
      style={{
        height: "100%",
        backgroundColor: "#0000000D",
        justifyContent: "center",
        alignItems: "center",
      }}
      name={name}
      size={size}
    />
  </Button>
);

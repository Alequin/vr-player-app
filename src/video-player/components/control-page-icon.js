import React from "react";
import { Icon } from "../../icon";

export const ControlPageIcon = (props) => (
  <Icon
    color="white"
    {...props}
    size={props.size || 26}
    style={{ paddingHorizontal: 15, ...props.style }}
  />
);

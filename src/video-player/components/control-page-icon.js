import React from "react";
import { Icon } from "../../icon";

export const ControlPageIcon = (props) => (
  <Icon
    size={26}
    color="white"
    {...props}
    style={{ paddingHorizontal: 15, ...props.style }}
  />
);

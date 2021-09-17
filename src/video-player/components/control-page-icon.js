import React from "react";
import { Icon } from "../../icon";

export const ControlPageIcon = ({ style, size, ...otherProps }) => (
  <Icon
    color="white"
    size={size || 26}
    style={[{ paddingHorizontal: 15 }, style]}
    {...otherProps}
  />
);

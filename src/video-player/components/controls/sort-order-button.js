import isEmpty from "lodash/isEmpty";
import React from "react";
import { Button } from "../../../button";
import { Icon } from "../../../icon";
import { ControlViewText } from "./control-views/control-view-text";

export const SortOrderButton = ({ text, style, ...otherProps }) => {
  return (
    <Button
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
      {...otherProps}
    >
      <ControlViewText style={{ margin: 5 }}>{text}</ControlViewText>
      <Icon name="sortOrder" size={22} color="white" style={{ margin: 5 }} />
    </Button>
  );
};

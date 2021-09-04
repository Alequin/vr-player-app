import React from "react";
import { Text } from "react-native";

export const ControlViewText = (props) => (
  <Text
    {...props}
    style={[
      {
        color: "white",
        fontSize: 16,
        marginVertical: 5,
      },
      props.style,
    ]}
  />
);

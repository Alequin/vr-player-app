import React from "react";
import { Text } from "react-native";

export const ControlViewText = (props) => (
  <Text
    style={{
      color: "white",
      fontSize: 18,
      marginVertical: 5,
      textAlign: "center",
    }}
    {...props}
  />
);

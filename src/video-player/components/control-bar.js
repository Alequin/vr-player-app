import React from "react";
import { View } from "react-native";

export const ControlBar = (props) => (
  <View
    {...props}
    style={{
      flexDirection: "row",
      width: "100%",
      backgroundColor: "#00000080",
      alignItems: "center",
      paddingHorizontal: 15,
      justifyContent: "space-between",
      ...props.style,
    }}
  />
);

import React from "react";
import { Text, TouchableOpacity } from "react-native";

export const ErrorView = ({
  onPressBack,
  errorMessage,
  onPressSelectAnotherVideo,
}) => {
  return (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        flex: 1,
        width: "100%",
        backgroundColor: "black",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
      onPress={onPressBack}
    >
      <Text style={{ color: "white" }}>
        Sorry, there was an issue playing the video:
      </Text>
      <Text style={{ color: "white" }}> {errorMessage}</Text>
    </TouchableOpacity>
  );
};

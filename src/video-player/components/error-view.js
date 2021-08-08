import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ControlPageIcon } from "./control-page-icon";

export const ErrorView = ({
  onPressBack,
  errorMessage,
  onPressSelectAnotherVideo,
}) => {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "flex-end",
      }}
      onPress={onPressBack}
    >
      <View
        style={{
          height: "80%",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ControlPageIcon name="warningOutline" color="#A5402D" size={26} />
        <ErrorText>Sorry, there was an issue playing the video</ErrorText>
        <ErrorText> {errorMessage}</ErrorText>
        <View style={{ flexDirection: "row", margin: 10 }}>
          <Button iconName="backArrow">Return to main page</Button>
          <Button iconName="folderVideo">Open a different video</Button>
        </View>
      </View>
    </View>
  );
};

const Button = ({ iconName, children }) => (
  <TouchableOpacity style={{ alignItems: "center", margin: 10 }}>
    <ControlPageIcon name={iconName} />
    <ErrorText>{children}</ErrorText>
  </TouchableOpacity>
);

const ErrorText = (props) => (
  <Text
    style={{
      color: "white",
      fontSize: 18,
      marginVertical: 5,
    }}
    {...props}
  />
);

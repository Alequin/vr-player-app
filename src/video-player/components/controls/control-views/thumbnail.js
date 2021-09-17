import React from "react";
import { Image, View } from "react-native";
import { Icon } from "../../../../icon";

export const Thumbnail = ({ thumbnail, testID, style }) => {
  return thumbnail ? (
    <Image source={{ uri: thumbnail }} style={style} testID={testID} />
  ) : (
    <View style={[{ justifyContent: "center", alignItems: "center" }, style]}>
      <Icon name="video" color="white" size={36} />
    </View>
  );
};

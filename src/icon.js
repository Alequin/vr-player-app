import {
  Feather,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  SimpleLineIcons,
} from "@expo/vector-icons";
import camelCase from "lodash/camelCase";
import React from "react";
import { View } from "react-native";

export const Icon = ({ name, ...otherProps }) => {
  const IconToRender = ICON_OPTIONS[name];
  if (!IconToRender)
    throw new Error(`Unable to find an icon by the name ${name}`);
  return <IconToRender {...otherProps} />;
};

const customIcon =
  (IconSourceElement, iconName) =>
  ({ size, color, style, ...otherProps }) =>
    (
      <TestIdElement testID={`${camelCase(iconName)}Icon`} style={style}>
        <IconSourceElement
          name={iconName}
          size={size}
          color={color}
          {...otherProps}
        />
      </TestIdElement>
    );

const ICON_OPTIONS = {
  play: customIcon(FontAwesome5, "play"),
  pause: customIcon(FontAwesome5, "pause"),
};

const TestIdElement = (props) => <View {...props} />;

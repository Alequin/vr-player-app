import {
  Entypo,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
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
  (IconSourceElement, iconName, { testIdOverride } = {}) =>
  ({ size, color, style, ...otherProps }) =>
    (
      <TestIdElement
        testID={
          testIdOverride
            ? `${testIdOverride}Icon`
            : `${camelCase(iconName)}Icon`
        }
        style={style}
      >
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
  vrHeadset: customIcon(FontAwesome5, "vr-cardboard", {
    testIdOverride: "vrHeadset",
  }),
  screenDesktop: customIcon(SimpleLineIcons, "screen-desktop"),
  stretchToPage: customIcon(MaterialCommunityIcons, "stretch-to-page"),
  fitScreen: customIcon(MaterialIcons, "fit-screen"),
  screenNormal: customIcon(Octicons, "screen-normal"),
  folderVideo: customIcon(Entypo, "folder-video"),
  backArrow: customIcon(Ionicons, "ios-arrow-back"),
  cancel: customIcon(MaterialCommunityIcons, "cancel"),
};

const TestIdElement = (props) => <View {...props} />;

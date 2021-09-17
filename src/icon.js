import Entypo from "@expo/vector-icons/Entypo";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Octicons from "@expo/vector-icons/Octicons";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";
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
  warningOutline: customIcon(Ionicons, "warning-outline"),
  cancel: customIcon(MaterialCommunityIcons, "cancel"),
  hourglass: customIcon(Ionicons, "hourglass-outline"),
  googlePlay: customIcon(Entypo, "google-play"),
  forward: customIcon(MaterialIcons, "forward-10"),
  replay: customIcon(MaterialIcons, "replay-10"),
  video: customIcon(Entypo, "video"),
  sortOrder: customIcon(FontAwesome, "sort-amount-asc"),
  shieldKey: customIcon(MaterialCommunityIcons, "shield-key"),
  playlist: customIcon(MaterialIcons, "playlist-add"),
  priorityUp: customIcon(MaterialCommunityIcons, "priority-high"),
  priorityDown: customIcon(MaterialCommunityIcons, "priority-low"),
  bin: customIcon(Ionicons, "ios-trash-bin-outline", {
    testIdOverride: "bin",
  }),
  refresh: customIcon(Feather, "refresh-ccw", {
    testIdOverride: "refresh",
  }),
};

const TestIdElement = (props) => <View {...props} />;

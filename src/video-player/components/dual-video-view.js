import { Video } from "expo-av";
import React from "react";
import { View } from "react-native";
import { PLAYER_MODES } from "../hooks/use-paired-video-players";

export const DualVideoView = ({
  videoLeft,
  videoRight,
  zIndex,
  videoPlayerMode,
  videoResizeMode,
}) => {
  return (
    <View
      style={{
        position: "absolute",
        flexDirection: "row",
        height: "100%",
        width: "100%",
        backgroundColor: "black",
        zIndex,
      }}
    >
      <VideoView
        testID="leftVideoPlayer"
        videoRef={videoLeft}
        videoResizeMode={videoResizeMode}
        fullScreen={videoPlayerMode === PLAYER_MODES.NORMAL_VIDEO}
      />
      <VideoView
        testID="rightVideoPlayer"
        videoRef={videoRight}
        videoResizeMode={videoResizeMode}
        hide={videoPlayerMode === PLAYER_MODES.NORMAL_VIDEO}
      />
    </View>
  );
};

const VideoView = ({
  testID,
  videoRef,
  videoSource,
  fullScreen,
  hide,
  videoResizeMode,
}) => (
  <Video
    testID={testID}
    style={{ width: videoViewWidth(fullScreen, hide), height: "100%" }}
    ref={videoRef}
    source={{
      uri: videoSource,
    }}
    resizeMode={videoResizeMode}
  />
);

const videoViewWidth = (fullScreen, hide) => {
  if (hide) return "0%";
  if (fullScreen) return "100%";
  return "50%";
};

import { Video } from "expo-av";
import React from "react";
import { View } from "react-native";
import { MODES } from "../hooks/use-paired-video-players";

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
        videoRef={videoLeft}
        videoResizeMode={videoResizeMode}
        fullScreen={videoPlayerMode === MODES.NORMAL_VIDEO}
      />
      <VideoView
        videoRef={videoRight}
        videoResizeMode={videoResizeMode}
        hide={videoPlayerMode === MODES.NORMAL_VIDEO}
        isMuted
      />
    </View>
  );
};

const VideoView = ({
  videoRef,
  videoSource,
  isMuted,
  fullScreen,
  hide,
  videoResizeMode,
}) => {
  return (
    <Video
      ref={videoRef}
      style={{ width: videoViewWidth(fullScreen, hide), height: "100%" }}
      source={{
        uri: videoSource,
      }}
      resizeMode={videoResizeMode}
    />
  );
};

const videoViewWidth = (fullScreen, hide) => {
  if (hide) return "0%";
  if (fullScreen) return "100%";
  return "50%";
};

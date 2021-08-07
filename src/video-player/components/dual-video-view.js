import { Video } from "expo-av";
import React from "react";
import { View } from "react-native";
import { MODES } from "../hooks/use-paired-video-players";

export const DualVideoView = ({
  videoLeft,
  videoRight,
  zIndex,
  videoPlayerMode,
}) => {
  return (
    <View
      style={{
        position: "absolute",
        flexDirection: "row",
        height: "100%",
        width: "100%",
        backgroundColor: "red",
        zIndex,
      }}
    >
      <VideoView
        videoRef={videoLeft}
        fullScreen={videoPlayerMode === MODES.NORMAL_VIDEO}
      />
      <VideoView
        videoRef={videoRight}
        isMuted
        hide={videoPlayerMode === MODES.NORMAL_VIDEO}
      />
    </View>
  );
};

const VideoView = ({ videoRef, videoSource, isMuted, fullScreen, hide }) => {
  return (
    <Video
      ref={videoRef}
      style={{ width: videoViewWidth(fullScreen, hide), height: "100%" }}
      source={{
        uri: videoSource,
      }}
      useNativeControls
      resizeMode={Video.RESIZE_MODE_STRETCH}
      isLooping
      isMuted={isMuted}
    />
  );
};

const videoViewWidth = (fullScreen, hide) => {
  if (hide) return "0%";
  if (fullScreen) return "100%";
  return "50%";
};

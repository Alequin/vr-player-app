import { Video } from "expo-av";
import React from "react";
import { View } from "react-native";

export const DualVideoView = ({ videoLeft, videoRight, zIndex }) => {
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
      <VideoView videoRef={videoLeft} />
      <VideoView videoRef={videoRight} isMuted />
    </View>
  );
};

const VideoView = ({ videoRef, videoSource, isMuted }) => {
  return (
    <Video
      ref={videoRef}
      style={{ width: "50%", height: "100%" }}
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

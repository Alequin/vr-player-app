import * as DocumentPicker from "expo-document-picker";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View, Text } from "react-native";
import { Controls } from "./components/controls";
import { DualVideoView } from "./components/dual-video-view";
import { VideoPlayerMask as ScreenMask } from "./components/screen-mask";
import { usePairedVideosPlayers } from "./hooks/use-paired-video-players";

export const VideoPlayer = () => {
  const [shouldResume, setShouldResume] = useState(false);
  const videoPlayer = usePairedVideosPlayers();

  return (
    <View style={styles.container}>
      {!videoPlayer.errorLoadingVideo ? (
        <DualVideoView
          videoLeft={videoPlayer.leftPlayer}
          videoRight={videoPlayer.rightPlayer}
          zIndex={-1}
        />
      ) : (
        <TouchableOpacity
          style={{
            position: "absolute",
            flexDirection: "row",
            height: "100%",
            width: "100%",
            backgroundColor: "red",
            zIndex: 2,
          }}
          onPress={() => {
            videoPlayer.clearError();
          }}
        >
          <Text>{videoPlayer.errorLoadingVideo}</Text>
        </TouchableOpacity>
      )}

      {/*z index has to be less than 1 to allow the user to press the custom controls */}
      <ScreenMask zIndex={0} shouldMakeMaskTransparent={videoPlayer.isLoaded} />
      <Controls
        isPlaying={videoPlayer.isPlaying}
        currentVideoPositionInMillis={videoPlayer.currentVideoPositionInMillis}
        videoDuration={videoPlayer.videoDuration}
        onPressSelectVideo={() => {
          DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: false,
          }).then((selectedVideo) =>
            videoPlayer.loadVideoSource(selectedVideo)
          );
        }}
        onSliderChange={(newPosition) => {
          videoPlayer.setDisplayPosition(newPosition);
          if (videoPlayer.isPlaying) {
            videoPlayer.pause();
            setShouldResume(true);
          }
        }}
        onSlidingComplete={async (newPosition) => {
          await videoPlayer.setPosition(newPosition);
          if (shouldResume) videoPlayer.play();
          setShouldResume(false);
        }}
        onPressPlay={() =>
          videoPlayer.isPlaying ? videoPlayer.pause() : videoPlayer.play()
        }
        zIndex={1}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    height: "100%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
});

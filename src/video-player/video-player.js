import * as DocumentPicker from "expo-document-picker";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Controls } from "./components/controls";
import { DualVideoView } from "./components/dual-video-view";
import { VideoPlayerMask as ScreenMask } from "./components/screen-mask";
import { usePairedVideosPlayers } from "./hooks/use-paired-video-players";

export const VideoPlayer = () => {
  const videoPlayer = usePairedVideosPlayers();

  return (
    <View style={styles.container}>
      <DualVideoView
        videoLeft={videoPlayer.leftPlayer}
        videoRight={videoPlayer.rightPlayer}
        zIndex={-1}
      />
      {/*z index has to be less than 1 to allow the user to press the custom controls */}
      <ScreenMask zIndex={0} shouldMakeMaskTransparent={videoPlayer.isLoaded} />
      <Controls
        isPlaying={videoPlayer.isPlaying}
        currentVideoPositionAsPercentage={
          videoPlayer.currentVideoPositionAsPercentage
        }
        currentVideoPositionInMillis={videoPlayer.currentVideoPositionInMillis}
        onPressSelectVideo={() => {
          DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: false,
          }).then((selectedVideo) =>
            videoPlayer.loadVideoSource(selectedVideo)
          );
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

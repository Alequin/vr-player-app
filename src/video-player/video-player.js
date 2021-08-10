import React from "react";
import { StyleSheet, View } from "react-native";
import { Controls } from "./components/controls/controls";
import { DualVideoView } from "./components/dual-video-view";
import { VideoPlayerMask as ScreenMask } from "./components/screen-mask";
import { usePairedVideosPlayers } from "./hooks/use-paired-video-players";

/*
  Layers / z index values

  -1: DualVideoView: behind all other elements to stop users from accessing the default video player controls
   0: ScreenMask: Covers the entire page to stop interaction with the default video player controls
   1: Controls: Above all others so can always be interacted with
*/

export const VideoPlayer = () => {
  const videoPlayer = usePairedVideosPlayers();

  return (
    <View style={styles.container}>
      {/* Remove video player if there is an error to reset the references */}
      {!videoPlayer.errorLoadingVideo && (
        <DualVideoView
          zIndex={-1}
          videoLeft={videoPlayer.leftPlayer}
          videoRight={videoPlayer.rightPlayer}
          videoResizeMode={videoPlayer.videoResizeMode}
          videoPlayerMode={videoPlayer.videoPlayerMode}
        />
      )}
      {/*z index has to be less than 1 to allow the user to press the custom controls */}
      <ScreenMask zIndex={0} isTransparent={videoPlayer.hasVideo} />
      <Controls zIndex={1} videoPlayer={videoPlayer} />
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

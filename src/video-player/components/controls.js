import Slider from "@react-native-community/slider";
import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Text, TouchableWithoutFeedback } from "react-native";
import { ControlBar } from "./control-bar";
import { ControlBarIconButton } from "./control-bar-icon-button";
import { ErrorView } from "./error-view";
import {
  millisecondsToTime,
  togglePlayerModeButtonIconName,
  toggleResizeModeButtonIconName,
} from "./utils";

export const Controls = ({ videoPlayer, zIndex }) => {
  const [shouldResume, setShouldResume] = useState(false);
  const { fadeAnim, showControls } = useShowControls(videoPlayer);

  return (
    <TouchableWithoutFeedback
      style={{
        opacity: fadeAnim,
        height: "100%",
        width: "100%",
        zIndex,
      }}
      onPress={showControls}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          height: "100%",
          width: "100%",
          justifyContent: videoPlayer.errorLoadingVideo
            ? "flex-start"
            : "space-between",
        }}
      >
        <UpperControlBar
          onPressAnyControls={showControls}
          onPressSelectVideo={() => {
            videoPlayer.clearError();
            DocumentPicker.getDocumentAsync({
              copyToCacheDirectory: false,
            }).then((selectedVideo) =>
              videoPlayer.loadVideoSource(selectedVideo)
            );
          }}
        />
        {videoPlayer.errorLoadingVideo && (
          <ErrorView
            onPressBack={videoPlayer.clearError}
            errorMessage={videoPlayer.errorLoadingVideo}
          />
        )}
        <LowerControlBar
          onPressAnyControls={showControls}
          isPlaying={videoPlayer.isPlaying}
          videoDuration={videoPlayer.videoDuration}
          currentVideoPositionInMillis={
            videoPlayer.currentVideoPositionInMillis
          }
          videoPlayerMode={videoPlayer.videoPlayerMode}
          videoResizeMode={videoPlayer.videoResizeMode}
          onPressPlay={() =>
            videoPlayer.isPlaying ? videoPlayer.pause() : videoPlayer.play()
          }
          onSeekVideoPosition={(newPosition) => {
            videoPlayer.setDisplayPosition(newPosition);
            if (videoPlayer.isPlaying) {
              videoPlayer.pause();
              setShouldResume(true);
            }
          }}
          onSeekVideoPositionComplete={async (newPosition) => {
            await videoPlayer.setPosition(newPosition);
            if (shouldResume) videoPlayer.play();
            setShouldResume(false);
          }}
          togglePlayerMode={() => videoPlayer.toggleVideoMode()}
          togglePlayerResizeMode={() => videoPlayer.toggleResizeMode()}
        />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const useShowControls = (videoPlayer) => {
  const [areControlsVisible, setAreControlsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showControls = useCallback(() => {
    fadeAnim.setValue(1);
    setAreControlsVisible(true);
  }, [fadeAnim?.current]);

  useEffect(() => {
    if (areControlsVisible && videoPlayer.isPlaying) {
      const timeout = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          setAreControlsVisible(false);
        });
      }, 7000);
      return () => clearTimeout(timeout);
    }
  }, [areControlsVisible, videoPlayer.isPlaying]);

  useEffect(() => {
    if (!videoPlayer.isPlaying) showControls();
  }, [showControls, videoPlayer.isPlaying]);

  return {
    fadeAnim,
    showControls,
  };
};

const UpperControlBar = ({ onPressAnyControls, onPressSelectVideo }) => {
  return (
    <ControlBar
      style={{
        justifyContent: "space-between",
      }}
    >
      <ControlBarIconButton name="backArrow" onPress={onPressAnyControls} />
      <ControlBarIconButton
        name="folderVideo"
        onPress={() => {
          onPressSelectVideo();
          onPressAnyControls();
        }}
      />
    </ControlBar>
  );
};

const LowerControlBar = ({
  isPlaying,
  onPressPlay,
  onPressAnyControls,
  videoDuration,
  onSeekVideoPositionComplete,
  onSeekVideoPosition,
  currentVideoPositionInMillis,
  togglePlayerMode,
  videoPlayerMode,
  videoResizeMode,
  togglePlayerResizeMode,
}) => {
  return (
    <ControlBar
      style={{
        justifyContent: "space-between",
      }}
    >
      <ControlBarIconButton
        name={isPlaying ? "pause" : "play"}
        onPress={() => {
          onPressPlay();
          onPressAnyControls();
        }}
      />
      <Text style={{ color: "white", fontWeight: "bold", fontSize: 17 }}>
        {millisecondsToTime(currentVideoPositionInMillis)}
      </Text>
      <Slider
        value={currentVideoPositionInMillis}
        maximumValue={videoDuration}
        minimumValue={0}
        step={1}
        style={{ flex: 1, height: 40 }}
        minimumTrackTintColor="#FFF"
        maximumTrackTintColor="#FFF"
        onValueChange={(newValue) => {
          onSeekVideoPosition(newValue);
          onPressAnyControls();
        }}
        onSlidingComplete={onSeekVideoPositionComplete}
      />
      <ControlBarIconButton
        name={togglePlayerModeButtonIconName(videoPlayerMode)}
        onPress={() => {
          togglePlayerMode();
          onPressAnyControls();
        }}
      />
      <ControlBarIconButton
        name={toggleResizeModeButtonIconName(videoResizeMode)}
        onPress={() => {
          togglePlayerResizeMode();
          onPressAnyControls();
        }}
      />
    </ControlBar>
  );
};

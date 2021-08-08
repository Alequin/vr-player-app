import Slider from "@react-native-community/slider";
import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MODES, RESIZE_MODES } from "../hooks/use-paired-video-players";
import { ControlPageIcon } from "./control-page-icon";
import { ErrorView } from "./error-view";

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

const togglePlayerModeButtonIconName = (videoPlayerMode) => {
  if (videoPlayerMode === MODES.VR_VIDEO) return "screenDesktop";
  if (videoPlayerMode === MODES.NORMAL_VIDEO) return "vrHeadset";
};

const toggleResizeModeButtonIconName = (videoResizeMode) => {
  if (videoResizeMode === RESIZE_MODES.RESIZE_MODE_COVER) return "screenNormal";
  if (videoResizeMode === RESIZE_MODES.RESIZE_MODE_CONTAIN) return "fitScreen";
  if (videoResizeMode === RESIZE_MODES.RESIZE_MODE_STRETCH)
    return "stretchToPage";
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

const ControlBar = (props) => (
  <View
    {...props}
    style={{
      flexDirection: "row",
      width: "100%",
      backgroundColor: "#00000080",
      alignItems: "center",
      paddingHorizontal: 15,
      ...props.style,
    }}
  />
);

const ControlBarIconButton = ({ onPress, name }) => (
  <TouchableOpacity onPress={onPress}>
    <ControlPageIcon name={name} />
  </TouchableOpacity>
);

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

const millisecondsToTime = (milliseconds) => {
  const totalSeconds = Math.round(milliseconds / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);

  const minutesExcludingHours = totalMinutes - totalHours * 60;
  const secondsExcludingMinutes = totalSeconds - totalMinutes * 60;

  return [
    totalHours,
    asTimeUnit(minutesExcludingHours),
    asTimeUnit(secondsExcludingMinutes),
  ].join(":");
};

const asTimeUnit = (number) => {
  const numberAsString = number.toString();

  if (numberAsString.length === 1) return `0${numberAsString}`;
  return numberAsString;
};

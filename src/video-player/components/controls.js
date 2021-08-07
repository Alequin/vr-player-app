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
import { Icon } from "../../icon";
import { MODES, RESIZE_MODES } from "../hooks/use-paired-video-players";

export const Controls = ({ videoPlayer, zIndex }) => {
  const [shouldResume, setShouldResume] = useState(false);
  const { fadeAnim, showControls } = useShowControls();

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
          justifyContent: "space-between",
        }}
      >
        <ControlBar
          style={{
            justifyContent: "flex-end",
          }}
        >
          <UpperControlBar
            videoPlayerMode={videoPlayer.videoPlayerMode}
            videoResizeMode={videoPlayer.videoResizeMode}
            onPressAnyControls={showControls}
            onPressSelectVideo={() => {
              DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: false,
              }).then((selectedVideo) =>
                videoPlayer.loadVideoSource(selectedVideo)
              );
            }}
            togglePlayerMode={() => videoPlayer.toggleVideoMode()}
            togglePlayerResizeMode={() => videoPlayer.toggleResizeMode()}
          />
        </ControlBar>
        <ControlBar>
          <LowerControlBar
            onPressAnyControls={showControls}
            isPlaying={videoPlayer.isPlaying}
            videoDuration={videoPlayer.videoDuration}
            currentVideoPositionInMillis={
              videoPlayer.currentVideoPositionInMillis
            }
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
          />
        </ControlBar>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const UpperControlBar = ({
  onPressAnyControls,
  onPressSelectVideo,
  togglePlayerMode,
  videoPlayerMode,
  videoResizeMode,
  togglePlayerResizeMode,
}) => {
  return (
    <>
      <ControlBarIconButton
        name="folderVideo"
        onPress={() => {
          onPressSelectVideo();
          onPressAnyControls();
        }}
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
    </>
  );
};

const togglePlayerModeButtonIconName = (videoPlayerMode) => {
  if (videoPlayerMode === MODES.VR_VIDEO) return "vrHeadset";
  if (videoPlayerMode === MODES.NORMAL_VIDEO) return "screenDesktop";
};

const toggleResizeModeButtonIconName = (videoResizeMode) => {
  if (videoResizeMode === RESIZE_MODES.RESIZE_MODE_COVER)
    return "stretchToPage";
  if (videoResizeMode === RESIZE_MODES.RESIZE_MODE_CONTAIN)
    return "screenNormal";
  if (videoResizeMode === RESIZE_MODES.RESIZE_MODE_STRETCH) return "fitScreen";
};

const LowerControlBar = ({
  isPlaying,
  onPressPlay,
  onPressAnyControls,
  videoDuration,
  onSeekVideoPositionComplete,
  onSeekVideoPosition,
  currentVideoPositionInMillis,
}) => {
  return (
    <>
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
        style={{ width: "80%", height: 40 }}
        minimumTrackTintColor="#FFF"
        maximumTrackTintColor="#FFF"
        onValueChange={(newValue) => {
          onSeekVideoPosition(newValue);
          onPressAnyControls();
        }}
        onSlidingComplete={onSeekVideoPositionComplete}
      />
    </>
  );
};

const ControlBar = (props) => (
  <View
    {...props}
    style={{
      flexDirection: "row",
      width: "100%",
      backgroundColor: "#00000080",
      padding: 10,
      alignItems: "center",
      paddingHorizontal: 15,
      ...props.style,
    }}
  />
);

const ControlBarIconButton = ({ onPress, name }) => (
  <TouchableOpacity onPress={onPress}>
    <Icon
      name={name}
      size={26}
      color="white"
      style={{ paddingHorizontal: 15 }}
    />
  </TouchableOpacity>
);

const useShowControls = () => {
  const [areControlsVisible, setAreControlsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (areControlsVisible) {
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
  }, [areControlsVisible]);

  return {
    fadeAnim,
    showControls: useCallback(() => {
      fadeAnim.setValue(1);
      setAreControlsVisible(true);
    }, [fadeAnim?.current]),
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

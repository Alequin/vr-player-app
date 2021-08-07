import Slider from "@react-native-community/slider";
import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Button,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Icon } from "../../icon";
import { MODES } from "../hooks/use-paired-video-players";

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
        <ControlBar>
          <UpperControlBar
            showControls={showControls}
            onPressSelectVideo={() => {
              DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: false,
              }).then((selectedVideo) =>
                videoPlayer.loadVideoSource(selectedVideo)
              );
            }}
            videoPlayerMode={videoPlayer.videoPlayerMode}
            togglePlayerMode={() => videoPlayer.toggleVideoMode()}
          />
        </ControlBar>
        <ControlBar>
          <LowerControlBar
            showControls={showControls}
            isPlaying={videoPlayer.isPlaying}
            videoDuration={videoPlayer.videoDuration}
            currentVideoPositionInMillis={
              videoPlayer.currentVideoPositionInMillis
            }
            onPressPlay={() =>
              videoPlayer.isPlaying ? videoPlayer.pause() : videoPlayer.play()
            }
            onSeekVideoPositionComplete={async (newPosition) => {
              await videoPlayer.setPosition(newPosition);
              if (shouldResume) videoPlayer.play();
              setShouldResume(false);
            }}
            onSeekVideoPosition={(newPosition) => {
              videoPlayer.setDisplayPosition(newPosition);
              if (videoPlayer.isPlaying) {
                videoPlayer.pause();
                setShouldResume(true);
              }
            }}
          />
        </ControlBar>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const UpperControlBar = ({
  showControls,
  onPressSelectVideo,
  togglePlayerMode,
  videoPlayerMode,
}) => {
  return (
    <>
      <Button onPress={onPressSelectVideo} title="Pick video" />
      <ControlBarIconButton
        name={togglePlayerModeButtonIconName(videoPlayerMode)}
        onPress={() => {
          togglePlayerMode();
          showControls();
        }}
      />
    </>
  );
};

const togglePlayerModeButtonIconName = (videoPlayerMode) => {
  if (videoPlayerMode === MODES.VR_VIDEO) return "vrHeadset";
  if (videoPlayerMode === MODES.NORMAL_VIDEO) return "screenDesktop";
};

const LowerControlBar = ({
  isPlaying,
  onPressPlay,
  showControls,
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
          showControls();
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
          showControls();
        }}
        onSlidingComplete={onSeekVideoPositionComplete}
      />
    </>
  );
};

const ControlBar = (props) => (
  <View
    style={{
      flexDirection: "row",
      width: "100%",
      backgroundColor: "#00000080",
      padding: 10,
      alignItems: "center",
    }}
    {...props}
  />
);

const ControlBarIconButton = ({ onPress, name }) => (
  <TouchableOpacity onPress={onPress}>
    <Icon name={name} size={26} color="white" style={{ padding: 10 }} />
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

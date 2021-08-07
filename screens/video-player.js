import { Video } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  StyleSheet,
  View,
  Animated,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Icon } from "../src/icon";

export const VideoPlayer = () => {
  const {
    filePath,
    currentVideoPosition,
    setFilePath,
    videoLeft,
    videoRight,
    play,
    pause,
    isPlaying,
  } = usePairedVideosPlayers();

  return (
    <View style={styles.container}>
      <DualVideoView
        videoLeft={videoLeft}
        videoRight={videoRight}
        filePath={filePath}
      />
      <StopOnPressOverlay />
      <Controls
        isPlaying={isPlaying}
        currentVideoPosition={currentVideoPosition}
        onPressSelectVideo={() => {
          DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: false,
          }).then(({ uri }) => setFilePath(uri));
        }}
        onPressPlay={() => (isPlaying ? pause() : play())}
      />
    </View>
  );
};

const DualVideoView = ({ videoLeft, videoRight, filePath }) => {
  return (
    <View
      style={{
        position: "absolute",
        flexDirection: "row",
        height: "100%",
        width: "100%",
        backgroundColor: "red",
        zIndex: -1,
      }}
    >
      <VideoView videoRef={videoLeft} videoSource={filePath} />
      <VideoView videoRef={videoRight} videoSource={filePath} isMuted />
    </View>
  );
};

const StopOnPressOverlay = () => (
  <View
    style={{
      position: "absolute",
      height: "100%",
      width: "100%",
      zIndex: 0, // has to be less than 1 to allow the controls to work
    }}
  />
);

const Controls = ({
  isPlaying,
  onPressSelectVideo,
  onPressPlay,
  currentVideoPosition,
}) => {
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

  return (
    <TouchableWithoutFeedback
      style={{
        opacity: fadeAnim,
        height: "100%",
        width: "100%",
        zIndex: 1,
      }}
      onPress={() => {
        if (!areControlsVisible) {
          fadeAnim.setValue(1);
          setAreControlsVisible(true);
        }
      }}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          height: "100%",
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            width: "100%",
            backgroundColor: "#00000080",
          }}
        >
          <Button onPress={onPressSelectVideo} title="Pick video" />
        </View>
        <View
          style={{
            flexDirection: "row",
            width: "100%",
            backgroundColor: "#00000080",
            padding: 10,
          }}
        >
          <TouchableOpacity
            onPress={onPressPlay}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <Icon
              name={isPlaying ? "pause" : "play"}
              size={26}
              color="white"
              style={{ marginHorizontal: 10 }}
            />
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 17 }}>
              {millisecondsToTime(currentVideoPosition)}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
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

const usePairedVideosPlayers = () => {
  const [filePath, setFilePath] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideoPosition, setCurrentVideoPosition] = useState(null);

  const videoLeft = useRef(null);
  const videoRight = useRef(null);

  useEffect(() => {
    if (filePath) {
      videoLeft?.current?.setPositionAsync(0);
      videoRight?.current?.setPositionAsync(0);
      setCurrentVideoPosition(0);
    }
  }, [filePath]);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        videoLeft?.current?.getStatusAsync().then(({ positionMillis }) => {
          setCurrentVideoPosition(positionMillis);
        });
      }, 250);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  return {
    currentVideoPosition,
    isPlaying,
    filePath,
    setFilePath,
    videoLeft,
    videoRight,
    play: async () => {
      if (filePath) {
        videoLeft.current.playAsync();
        videoRight.current.playAsync();
        setIsPlaying(true);
      }
    },
    pause: () => {
      if (filePath) {
        videoLeft.current.pauseAsync();
        videoRight.current.pauseAsync();
        setIsPlaying(false);
      }
    },
  };
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

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Button,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Icon } from "../../icon";

export const Controls = ({
  isPlaying,
  onPressSelectVideo,
  onPressPlay,
  currentVideoPosition,
  zIndex,
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
        zIndex,
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

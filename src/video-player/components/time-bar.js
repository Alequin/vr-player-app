import Slider from "@react-native-community/slider";
import React from "react";

export const TimeBar = ({
  currentPosition,
  videoDuration,
  onSeekVideoPositionStart,
  onSeekVideoPosition,
  onSeekVideoPositionComplete,
}) => {
  return (
    <Slider
      value={currentPosition}
      maximumValue={videoDuration}
      minimumValue={0}
      step={Math.round(videoDuration / 400)} // ensure the number of steps is always the same
      style={{ flex: 1, height: 40 }}
      minimumTrackTintColor="#FFF"
      maximumTrackTintColor="#FFF"
      onSlidingStart={onSeekVideoPositionStart}
      onValueChange={onSeekVideoPosition}
      onSlidingComplete={onSeekVideoPositionComplete}
    />
  );
};

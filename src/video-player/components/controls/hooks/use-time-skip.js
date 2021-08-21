import { isNil } from "lodash";
import { useCallback, useEffect, useState } from "react";

export const useSkipTime = (videoPlayer) => {
  const [wasPaused, setWasPaused] = useState(false);
  const [timeToSkipTo, setTimeToSkipTo] = useState(null);
  useEffect(() => {
    if (!isNil(timeToSkipTo)) {
      const timeout = setTimeout(async () => {
        await videoPlayer.setPosition(
          calcTimeToSkipTo(timeToSkipTo, videoPlayer.videoDuration)
        );
        if (!wasPaused) await videoPlayer.play(); // Only start playing if it was not previously paused
        setTimeToSkipTo(null);
        setWasPaused(false);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [
    timeToSkipTo,
    wasPaused,
    videoPlayer.setPosition,
    videoPlayer.play,
    videoPlayer.videoDuration,
  ]);

  return useCallback(
    (func) => {
      if (!timeToSkipTo) setWasPaused(!videoPlayer.isPlaying);
      setTimeToSkipTo(func);
    },
    [videoPlayer.isPlaying, timeToSkipTo]
  );
};

const calcTimeToSkipTo = (timeToSkipTo, videoDuration) => {
  const isAtStart = timeToSkipTo < 0;
  if (isAtStart) return 0;

  const isAtEnd = timeToSkipTo >= videoDuration;
  if (isAtEnd) return videoDuration;

  return timeToSkipTo;
};

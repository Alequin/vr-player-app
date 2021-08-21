import { isNil } from "lodash";
import { useCallback, useEffect, useState } from "react";

export const useSkipTime = (videoPlayer) => {
  const [wasPaused, setWasPaused] = useState(false);
  const [timeToSkipTo, setTimeToSkipTo] = useState(null);
  useEffect(() => {
    if (!isNil(timeToSkipTo)) {
      const timeout = setTimeout(async () => {
        await videoPlayer.setPosition(timeToSkipTo);
        if (!wasPaused) await videoPlayer.play(); // Only start playing if it was not previously paused
        setTimeToSkipTo(null);
        setWasPaused(false);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [timeToSkipTo, videoPlayer.setPosition, videoPlayer.play, wasPaused]);

  return useCallback(
    (func) => {
      if (!timeToSkipTo) setWasPaused(!videoPlayer.isPlaying);
      setTimeToSkipTo(func);
    },
    [videoPlayer.isPlaying, timeToSkipTo]
  );
};

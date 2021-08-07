import { useCallback, useEffect, useRef, useState } from "react";

export const usePairedVideosPlayers = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentVideoPosition, setCurrentVideoPosition] = useState(null);
  const [filePath, setFilePath] = useState(null);

  const primaryVideo = useRef(null);
  const secondaryVideo = useRef(null);

  const play = useCallback(async () => {
    if (filePath) {
      await Promise.all([
        primaryVideo.current.playAsync(),
        secondaryVideo.current.playAsync(),
      ]);
      setIsPlaying(true);
    }
  }, [filePath, primaryVideo?.current, secondaryVideo?.current]);

  const setPosition = useCallback(
    async (position) => {
      if (filePath) {
        await Promise.all([
          primaryVideo?.current?.setPositionAsync(position),
          secondaryVideo?.current?.setPositionAsync(position),
        ]);
        setCurrentVideoPosition(position);
      }
    },
    [filePath, primaryVideo?.current, secondaryVideo?.current]
  );

  useEffect(() => {
    // Update the state tracking the current video position while the video plays
    if (isPlaying) {
      const interval = setInterval(() => {
        primaryVideo?.current?.getStatusAsync().then(({ positionMillis }) => {
          setCurrentVideoPosition(positionMillis);
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  useEffect(() => {
    // Start playing video from beginning when one is selected
    if (filePath) {
      setPosition(0).then(() => {
        play();
      });
    }
  }, [filePath]);

  return {
    isPlaying,
    currentVideoPosition,
    leftPlayer: primaryVideo,
    rightPlayer: secondaryVideo,
    play,
    setPosition,
    pause: async () => {
      if (filePath) {
        await Promise.all([
          primaryVideo.current.pauseAsync(),
          secondaryVideo.current.pauseAsync(),
        ]);
        setIsPlaying(false);
      }
    },
    loadVideoSource: async (newFilePath) => {
      await Promise.all([
        primaryVideo?.current?.loadAsync(newFilePath),
        secondaryVideo?.current?.loadAsync(newFilePath),
      ]);
      setFilePath(newFilePath);
    },
  };
};

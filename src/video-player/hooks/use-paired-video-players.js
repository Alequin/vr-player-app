import { useCallback, useEffect, useRef, useState } from "react";

export const usePairedVideosPlayers = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentVideoPositionInMillis, setCurrentVideoPositionInMillis] =
    useState(null);
  const [
    currentVideoPositionAsPercentage,
    setCurrentVideoPositionAsPercentage,
  ] = useState(null);

  const [filePath, setFilePath] = useState(null);

  const primaryVideo = useRef(null);
  const secondaryVideo = useRef(null);

  const play = useCallback(async () => {
    if (filePath) {
      await Promise.all([
        primaryVideo.current.playAsync(),
        secondaryVideo.current.playAsync(),
      ]);
    }
  }, [filePath, primaryVideo?.current, secondaryVideo?.current]);

  const setPosition = useCallback(
    async (position) => {
      if (filePath) {
        await Promise.all([
          primaryVideo?.current?.setPositionAsync(position),
          secondaryVideo?.current?.setPositionAsync(position),
        ]);
      }
    },
    [filePath, primaryVideo?.current, secondaryVideo?.current]
  );

  useEffect(() => {
    // Update known video player positions
    primaryVideo?.current?.setOnPlaybackStatusUpdate(
      ({ isLoaded, positionMillis, durationMillis, isPlaying }) => {
        if (isLoaded) {
          setIsPlaying(isPlaying);
          setCurrentVideoPositionInMillis(positionMillis);
          setCurrentVideoPositionAsPercentage(positionMillis / durationMillis);
        }
      }
    );
  }, [primaryVideo?.current]);

  useEffect(() => {
    // Start playing video from beginning when one is selected
    if (filePath) {
      setPosition(0).then(() => {
        play();
      });
    }
  }, [filePath]);

  return {
    isLoaded,
    isPlaying,
    currentVideoPositionInMillis,
    currentVideoPositionAsPercentage,
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
      }
    },
    loadVideoSource: async (newFilePath) => {
      try {
        await Promise.all([
          primaryVideo?.current?.loadAsync(newFilePath, {
            progressUpdateIntervalMillis: 25,
          }),
          secondaryVideo?.current?.loadAsync(newFilePath, {
            progressUpdateIntervalMillis: 25,
          }),
        ]);
      } catch (error) {
        // TODO display error message on screen on load failure
        console.error("Unable to load select file");
        setFilePath(null);
        setIsLoaded(false);
      }

      const { isLoaded } = await primaryVideo?.current?.getStatusAsync();
      setIsLoaded(isLoaded);
      if (isLoaded) return setFilePath(newFilePath);
    },
  };
};

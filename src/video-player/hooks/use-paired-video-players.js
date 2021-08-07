import { useCallback, useEffect, useRef, useState } from "react";

export const MODES = {
  VR_VIDEO: "vr",
  NORMAL_VIDEO: "normal-video",
};

export const usePairedVideosPlayers = () => {
  const [videoPlayerMode, setVideoPlayerMode] = useState(MODES.VR_VIDEO);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorLoadingVideo, setErrorLoadingVideo] = useState(false);

  const [currentVideoPositionInMillis, setCurrentVideoPositionInMillis] =
    useState(null);

  const [videoDuration, setVideoDuration] = useState(null);

  const primaryVideo = useRef(null);
  const secondaryVideo = useRef(null);

  const play = useCallback(async () => {
    if (isLoaded) {
      await Promise.all([
        primaryVideo.current.playAsync(),
        secondaryVideo.current.playAsync(),
      ]);
    }
  }, [isLoaded, primaryVideo?.current, secondaryVideo?.current]);

  const setPosition = useCallback(
    async (position) => {
      if (isLoaded) {
        await Promise.all([
          primaryVideo?.current?.setPositionAsync(position),
          secondaryVideo?.current?.setPositionAsync(position),
        ]);
        setCurrentVideoPositionInMillis(position);
      }
    },
    [isLoaded, primaryVideo?.current, secondaryVideo?.current]
  );

  useEffect(() => {
    // Start playing video from beginning when one is selected
    if (isLoaded) setPosition(0).then(play);
  }, [isLoaded]);

  return {
    isLoaded,
    isPlaying,
    currentVideoPositionInMillis,
    videoDuration,
    leftPlayer: primaryVideo,
    rightPlayer: secondaryVideo,
    errorLoadingVideo,
    videoPlayerMode,
    clearError: () => setErrorLoadingVideo(false),
    play,
    setPosition,
    setDisplayPosition: setCurrentVideoPositionInMillis,
    pause: async () => {
      if (isLoaded) {
        await Promise.all([
          primaryVideo.current.pauseAsync(),
          secondaryVideo.current.pauseAsync(),
        ]);
      }
    },
    loadVideoSource: async (newFilePath) => {
      try {
        // Load video
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
        setErrorLoadingVideo(
          `Unable to load file ${newFilePath.name} as a video`
        );
        setIsLoaded(false);
        setVideoDuration(0);
        return;
      }

      // Update state to indicate the video is available
      const { isLoaded, durationMillis } =
        await primaryVideo?.current?.getStatusAsync();

      setIsLoaded(isLoaded);
      setVideoDuration(durationMillis);

      // Manage state updates
      primaryVideo?.current?.setOnPlaybackStatusUpdate(
        ({ isLoaded, positionMillis, isPlaying }) => {
          setIsPlaying(isPlaying);
          setCurrentVideoPositionInMillis(isLoaded ? positionMillis : 0);
        }
      );
    },
    toggleVideoMode: () => {
      setVideoPlayerMode(
        videoPlayerMode === MODES.VR_VIDEO ? MODES.NORMAL_VIDEO : MODES.VR_VIDEO
      );
    },
  };
};

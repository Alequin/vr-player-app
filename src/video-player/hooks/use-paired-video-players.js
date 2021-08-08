import { ResizeMode, Video } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { isNil } from "lodash";

export const MODES = {
  VR_VIDEO: "vr",
  NORMAL_VIDEO: "normal-video",
};

export const RESIZE_MODES = {
  RESIZE_MODE_COVER: Video.RESIZE_MODE_COVER,
  RESIZE_MODE_CONTAIN: Video.RESIZE_MODE_CONTAIN,
  RESIZE_MODE_STRETCH: Video.RESIZE_MODE_STRETCH,
};

const resizeModesToggleOrder = [
  RESIZE_MODES.RESIZE_MODE_COVER,
  RESIZE_MODES.RESIZE_MODE_CONTAIN,
  RESIZE_MODES.RESIZE_MODE_STRETCH,
];

export const usePairedVideosPlayers = () => {
  const [videoPlayerMode, setVideoPlayerMode] = useState(MODES.VR_VIDEO);
  const [videoResizeMode, setResizeMode] = useState(
    RESIZE_MODES.RESIZE_MODE_COVER
  );

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
      setIsPlaying(true);
    }
  }, [isLoaded, primaryVideo?.current, secondaryVideo?.current]);

  const setPosition = useCallback(
    async (position) => {
      if (isLoaded && !isNil(position)) {
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

  useEffect(() => {
    if (primaryVideo?.current && isPlaying && isLoaded) {
      const interval = setInterval(async () => {
        const { positionMillis } =
          await primaryVideo?.current?.getStatusAsync();
        if (!isNil(positionMillis)) {
          setCurrentVideoPositionInMillis(positionMillis);
        }
      }, 25);
      return () => {
        clearInterval(interval);
      };
    }
  }, [primaryVideo?.current, isPlaying, isLoaded]);

  return {
    isLoaded,
    isPlaying,
    currentVideoPositionInMillis,
    videoDuration,
    leftPlayer: primaryVideo,
    rightPlayer: secondaryVideo,
    errorLoadingVideo,
    videoPlayerMode,
    videoResizeMode,
    play,
    setPosition,
    setDisplayPosition: setCurrentVideoPositionInMillis,
    clearError: useCallback(() => setErrorLoadingVideo(false), []),
    pause: useCallback(async () => {
      if (isLoaded) {
        await Promise.all([
          primaryVideo?.current?.pauseAsync(),
          secondaryVideo?.current?.pauseAsync(),
        ]);
        setIsPlaying(false);
      }
    }, [primaryVideo?.current, secondaryVideo?.current, isLoaded]),
    loadVideoSource: useCallback(
      async (newFileObject) => {
        if (newFileObject.type === "cancel") return;

        try {
          // Load video
          await Promise.all([
            primaryVideo?.current?.loadAsync(newFileObject, {
              isLooping: true,
            }),
            secondaryVideo?.current?.loadAsync(newFileObject, {
              isLooping: true,
              isMuted: true,
            }),
          ]);
        } catch (error) {
          // TODO display error message on screen on load failure
          setErrorLoadingVideo(
            `Unable to play ${newFileObject.name} as a video`
          );
          setIsLoaded(false);
          setVideoDuration(0);
          setIsPlaying(false);
          setCurrentVideoPositionInMillis(0);
          return;
        }

        // Update state to indicate the video is available
        const { isLoaded, durationMillis } =
          await primaryVideo?.current?.getStatusAsync();

        setIsLoaded(isLoaded);
        setVideoDuration(durationMillis);
      },
      [primaryVideo?.current, secondaryVideo?.current]
    ),
    toggleVideoMode: useCallback(
      () =>
        setVideoPlayerMode((currentVideoPlayerMode) =>
          currentVideoPlayerMode === MODES.VR_VIDEO
            ? MODES.NORMAL_VIDEO
            : MODES.VR_VIDEO
        ),
      []
    ),
    toggleResizeMode: useCallback(
      () =>
        setResizeMode((currentResizeMode) => {
          const currentIndex = resizeModesToggleOrder.findIndex(
            (mode) => mode === currentResizeMode
          );

          const nextIndex = currentIndex + 1;

          return resizeModesToggleOrder[
            nextIndex >= resizeModesToggleOrder.length ? 0 : nextIndex
          ];
        }),
      []
    ),
  };
};

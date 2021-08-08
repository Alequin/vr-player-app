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

  const [loadedFilepath, setLoadedFilepath] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorLoadingVideo, setErrorLoadingVideo] = useState(false);

  const [currentVideoPositionInMillis, setCurrentVideoPositionInMillis] =
    useState(null);

  const [videoDuration, setVideoDuration] = useState(null);

  const primaryVideo = useRef(null);
  const secondaryVideo = useRef(null);

  const play = useCallback(async () => {
    if (loadedFilepath) {
      await Promise.all([
        primaryVideo.current.playAsync(),
        secondaryVideo.current.playAsync(),
      ]);
      setIsPlaying(true);
    }
  }, [loadedFilepath, primaryVideo?.current, secondaryVideo?.current]);

  const setPosition = useCallback(
    async (position) => {
      if (loadedFilepath && !isNil(position)) {
        await Promise.all([
          primaryVideo?.current?.setPositionAsync(position),
          secondaryVideo?.current?.setPositionAsync(position),
        ]);
        setCurrentVideoPositionInMillis(position);
      }
    },
    [loadedFilepath, primaryVideo?.current, secondaryVideo?.current]
  );

  useEffect(() => {
    // Start playing video from beginning when a new one is selected
    if (loadedFilepath) setPosition(0).then(play);
  }, [loadedFilepath]);

  useEffect(() => {
    if (primaryVideo?.current && isPlaying && loadedFilepath) {
      const interval = setInterval(() => {
        primaryVideo?.current
          ?.getStatusAsync()
          .then(({ positionMillis, isPlaying }) => {
            if (!isNil(positionMillis) && isPlaying)
              setCurrentVideoPositionInMillis(positionMillis);
          });
      }, 25);
      return () => clearInterval(interval);
    }
  }, [primaryVideo?.current, isPlaying, loadedFilepath]);

  return {
    isLoaded: loadedFilepath,
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
      if (loadedFilepath) {
        await Promise.all([
          primaryVideo?.current?.pauseAsync(),
          secondaryVideo?.current?.pauseAsync(),
        ]);
        setIsPlaying(false);
      }
    }, [primaryVideo?.current, secondaryVideo?.current, loadedFilepath]),
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

          // Update state to indicate the video is available
          const { durationMillis } =
            await primaryVideo?.current?.getStatusAsync();

          setLoadedFilepath(newFileObject.uri);
          setVideoDuration(durationMillis);
        } catch (error) {
          setErrorLoadingVideo(
            `Unable to play ${newFileObject.name} as a video`
          );
          setIsPlaying(false);
          setLoadedFilepath(null);
          setVideoDuration(0);
          return;
        } finally {
          setCurrentVideoPositionInMillis(0);
        }
      },
      [primaryVideo?.current, secondaryVideo?.current]
    ),
    unloadVideo: useCallback(async () => {
      await Promise.all([
        primaryVideo?.current?.unloadAsync(),
        secondaryVideo?.current?.unloadAsync(),
      ]);

      setLoadedFilepath(null);
      setVideoDuration(0);
      setIsPlaying(false);
      setCurrentVideoPositionInMillis(0);
    }, [primaryVideo?.current, secondaryVideo?.current]),
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

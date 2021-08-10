import { Video } from "expo-av";
import { isNil } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";

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

  const [isLoading, setIsLoading] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorLoadingVideo, setErrorLoadingVideo] = useState(false);

  const [currentVideoPositionInMillis, setCurrentVideoPositionInMillis] =
    useState(null);

  const [videoDuration, setVideoDuration] = useState(null);

  const primaryVideo = useRef(null);
  const secondaryVideo = useRef(null);

  const play = useCallback(async () => {
    if (hasVideo) {
      try {
        await Promise.all([
          primaryVideo.current.playAsync(),
          secondaryVideo.current.playAsync(),
        ]);
        setIsPlaying(true);
      } catch (error) {
        console.error(error);
        setErrorLoadingVideo("There was an issue trying to start the video");
      }
    }
  }, [hasVideo, primaryVideo?.current, secondaryVideo?.current]);

  const pause = useCallback(async () => {
    if (hasVideo) {
      try {
        await Promise.all([
          primaryVideo?.current?.pauseAsync(),
          secondaryVideo?.current?.pauseAsync(),
        ]);
        setIsPlaying(false);
      } catch (error) {
        console.error(error);
        setErrorLoadingVideo("There was an issue trying to pause the video");
      }
    }
  }, [primaryVideo?.current, secondaryVideo?.current, hasVideo]);

  const setPosition = useCallback(
    async (position) => {
      if (hasVideo && !isNil(position)) {
        await Promise.all([
          primaryVideo?.current?.setPositionAsync(position),
          secondaryVideo?.current?.setPositionAsync(position),
        ]);
        setCurrentVideoPositionInMillis(position);
      }
    },
    [hasVideo, primaryVideo?.current, secondaryVideo?.current]
  );

  useEffect(() => {
    // Start playing video from beginning when a new one is selected
    if (hasVideo) {
      setIsLoading(true);
      // Delay starting the video to stop issues with ads and video players becoming out of sync
      let timeout = null;
      setPosition(0).then(
        () =>
          (timeout = setTimeout(() => {
            play();
            setIsLoading(false);
          }, 500))
      );
      return () => clearTimeout(timeout);
    }
  }, [hasVideo]);

  useEffect(() => {
    if (primaryVideo?.current && isPlaying && hasVideo) {
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
  }, [primaryVideo?.current, isPlaying, hasVideo]);

  return {
    hasVideo: hasVideo,
    isLoading,
    isPlaying,
    currentVideoPositionInMillis,
    videoDuration,
    leftPlayer: primaryVideo,
    rightPlayer: secondaryVideo,
    errorLoadingVideo,
    videoPlayerMode,
    videoResizeMode,
    play,
    pause,
    setPosition,
    setDisplayPosition: setCurrentVideoPositionInMillis,
    clearError: useCallback(() => setErrorLoadingVideo(false), []),
    loadVideoSource: useCallback(
      async (newFileObject) => {
        if (newFileObject.type === "cancel") return;

        try {
          // Load video
          // Set hasVideo early to ensure the correct pages are shown while the videos are loading
          setHasVideo(true);

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

          setVideoDuration(durationMillis);
        } catch (error) {
          console.error(error);
          setErrorLoadingVideo(
            `Unable to play ${newFileObject.name} as a video`
          );
          setHasVideo(false);
          setVideoDuration(0);
        } finally {
          setIsPlaying(false);
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

      setHasVideo(null);
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

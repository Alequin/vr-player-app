import { AdMobInterstitial } from "expo-ads-admob";
import { Video } from "expo-av";
import { isNil } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import { isEnvironmentProduction } from "../../is-environment-production";
import { logError } from "../../logger";
import { minutesToMilliseconds } from "../../minutes-to-milliseconds";
import { useShowInterstitialAd } from "./use-show-interstitial-ad";
import { useVideoPlayerRefs } from "./use-video-player-refs";

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
  const videoPlayer = useVideoPlayerRefs();

  const [videoPlayerMode, setVideoPlayerMode] = useState(MODES.VR_VIDEO);
  const [videoResizeMode, setResizeMode] = useState(
    RESIZE_MODES.RESIZE_MODE_COVER
  );

  const [isLoading, setIsLoading] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isNewLoop, setIsNewLoop] = useState(false);
  const [errorLoadingVideo, setErrorLoadingVideo] = useState(false);

  const [currentVideoPositionInMillis, setCurrentVideoPositionInMillis] =
    useState(null);

  const [videoDuration, setVideoDuration] = useState(null);

  const play = async () => {
    if (hasVideo) {
      try {
        setIsLoading(false);
        setIsNewLoop(false);
        setIsPlaying(true);
        await videoPlayer.play();
      } catch (error) {
        console.error(error);
        setErrorLoadingVideo("There was an issue trying to start the video");
      }
    }
  };

  const pause = useCallback(async () => {
    if (hasVideo) {
      try {
        setIsPlaying(false);
        setIsNewLoop(false);
        await videoPlayer.pause();
      } catch (error) {
        console.error(error);
        setErrorLoadingVideo("There was an issue trying to pause the video");
      }
    }
  }, [hasVideo, videoPlayer.pause]);

  const setPosition = useCallback(
    async (position) => {
      if (hasVideo && !isNil(position)) {
        await videoPlayer.setPosition(position);
        setCurrentVideoPositionInMillis(position);
      }
    },
    [hasVideo, videoPlayer.setPosition]
  );

  useEffect(() => {
    if (isPlaying && hasVideo) {
      const interval = setInterval(() => {
        videoPlayer
          .getStatus()
          .then(
            async ({ isStatusAvailable, positionMillis, durationMillis }) => {
              if (!isStatusAvailable) return;

              if (!isNil(positionMillis) && isPlaying)
                setCurrentVideoPositionInMillis(positionMillis);

              /*
              Manually implement looping to:
                - fix issues with video players falling out of sync 
                - fix issues with controls staying visible after first loop
            */
              const didFinish =
                positionMillis &&
                durationMillis &&
                positionMillis >= durationMillis;
              if (didFinish) {
                setIsNewLoop(true);
                await pause();
                await setPosition(0);
                await play();
              }
            }
          );
      }, 25);
      return () => clearInterval(interval);
    }
  }, [videoPlayer.getStatus, isPlaying, hasVideo, setPosition, pause, play]);

  const showInterstitialAd = useShowInterstitialAd({
    onFinishShowingAd: useCallback(async () => {
      if (!hasVideo) return;
      setIsLoading(true);
      // Update state to indicate the video is available
      const { durationMillis } = await videoPlayer.getStatus();
      setVideoDuration(durationMillis);
      await setPosition(0);
      await play();
    }, [hasVideo, setPosition, play]),
  });

  useEffect(() => {
    if (hasVideo) {
    }
  }, [hasVideo]);

  return {
    hasVideo: hasVideo,
    isLoading,
    isPlaying,
    isNewLoop,
    currentVideoPositionInMillis,
    videoDuration,
    leftPlayer: videoPlayer.refs.primaryVideo,
    rightPlayer: videoPlayer.refs.secondaryVideo,
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
          await videoPlayer.load(newFileObject, {
            secondaryOptions: {
              isMuted: true,
            },
          });

          await showInterstitialAd();
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
      [videoPlayer.load, videoPlayer.getStatus]
    ),
    unloadVideo: useCallback(async () => {
      await videoPlayer.unload();

      setHasVideo(null);
      setVideoDuration(0);
      setIsPlaying(false);
      setCurrentVideoPositionInMillis(0);
    }, [videoPlayer.unload]),
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

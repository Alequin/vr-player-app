import { Video } from "expo-av";
import { isNil } from "lodash";
import { useCallback, useEffect, useState } from "react";
import { logError } from "../../logger";
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

  const play = useCallback(async () => {
    if (hasVideo) {
      try {
        setIsLoading(false);
        setIsNewLoop(false);
        setIsPlaying(true);
        await videoPlayer.play();
      } catch (error) {
        logError(error);
        setErrorLoadingVideo("There was an issue trying to start the video");
      }
    }
  }, [hasVideo, videoPlayer.play, setPosition, currentVideoPositionInMillis]);

  const pause = useCallback(async () => {
    if (hasVideo) {
      try {
        setIsPlaying(false);
        setIsNewLoop(false);
        await videoPlayer.pause();
      } catch (error) {
        logError(error);
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

  const unloadVideo = useCallback(async () => {
    if (!hasVideo) return;
    await videoPlayer.unload();

    setVideoDuration(0);
    setHasVideo(null);
    setIsPlaying(false);
    setCurrentVideoPositionInMillis(0);
  }, [videoPlayer.unload, hasVideo]);

  useEffect(() => {
    if (isPlaying && hasVideo) {
      const interval = setInterval(() => {
        videoPlayer
          .getStatus()
          .then(
            async ({
              isStatusAvailable,
              primaryStatus: { positionMillis, durationMillis },
              secondaryStatus,
            }) => {
              if (!isStatusAvailable) return;

              // Update the known video position
              if (!isNil(positionMillis) && isPlaying) {
                setCurrentVideoPositionInMillis(positionMillis);
              }

              const playerPositionDifference =
                positionMillis - secondaryStatus.positionMillis;

              // Resync video positions if required
              if (!arePlayerInSync(playerPositionDifference)) {
                if (arePlayersVeryOutOfSync(playerPositionDifference)) {
                  await setPosition(positionMillis);
                } else {
                  const isPrimaryAhead = playerPositionDifference > 0;
                  isPrimaryAhead
                    ? await videoPlayer.delayPrimary(25)
                    : await videoPlayer.delaySecondary(25);
                }
              }

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
      await play();
    }, [hasVideo, setPosition, play, videoPlayer.getStatus]),
  });

  return {
    hasVideo,
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
    unloadVideo,
    loadVideoSource: useCallback(
      async (newFileObject) => {
        if (newFileObject.type === "cancel") return;

        try {
          await unloadVideo();

          // Load video
          // Set hasVideo early to ensure the correct pages are shown while the videos are loading
          setHasVideo(true);
          await videoPlayer.load(newFileObject, {
            secondaryOptions: {
              isMuted: true,
            },
          });

          const {
            primaryStatus: { durationMillis },
          } = await videoPlayer.getStatus();
          setVideoDuration(durationMillis);

          await showInterstitialAd();
        } catch (error) {
          logError(error);
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
      [unloadVideo, videoPlayer.load, showInterstitialAd]
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

const MAX_IN_SYNC_MILLISECOND_DIFFERENCE = 25;
const arePlayerInSync = (playerPositionDifference) =>
  Math.abs(playerPositionDifference) <= MAX_IN_SYNC_MILLISECOND_DIFFERENCE;

const arePlayersVeryOutOfSync = (playerPositionDifference) =>
  Math.abs(playerPositionDifference) > 100;

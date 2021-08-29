import { Video } from "expo-av";
import isNil from "lodash/isNil";
import { useCallback, useEffect, useState } from "react";
import { logError } from "../../logger";
import { playerMode, resizeMode } from "../async-storage";
import { arePlayerInSync, resyncVideos } from "./resync-videos";
import { useShowInterstitialAd } from "./use-show-interstitial-ad";
import { useVideoPlayerRefs } from "./use-video-player-refs";

export const PLAYER_MODES = {
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

  const { videoPlayerMode, toggleVideoPlayerMode } = usePlayerMode();
  const { videoResizeMode, toggleResizeMode } = usePlayerResizeMode();

  const [isLoading, setIsLoading] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isNewLoop, setIsNewLoop] = useState(false);
  const [errorLoadingVideo, setErrorLoadingVideo] = useState(false);

  const [currentVideoPositionInMillis, setCurrentVideoPositionInMillis] =
    useState(0);

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
          .then(async ({ primaryStatus, secondaryStatus }) => {
            if (!primaryStatus || !secondaryStatus) return;

            // Update the known video position
            if (!isNil(primaryStatus.positionMillis) && isPlaying) {
              setCurrentVideoPositionInMillis(primaryStatus.positionMillis);
            }

            if (!arePlayerInSync(primaryStatus, secondaryStatus)) {
              await resyncVideos(
                videoPlayer,
                primaryStatus,
                secondaryStatus,
                setPosition
              );
            }

            /*
              Manually implement looping to:
                - fix issues with video players falling out of sync 
                - fix issues with controls staying visible after first loop
            */
            const didFinish =
              primaryStatus.positionMillis &&
              primaryStatus.durationMillis &&
              primaryStatus.positionMillis >= primaryStatus.durationMillis;
            if (didFinish) {
              setIsNewLoop(true);
              await pause();
              await setPosition(0);
              await play();
            }
          });
      }, 25);
      return () => clearInterval(interval);
    }
  }, [videoPlayer.getStatus, isPlaying, hasVideo, setPosition, pause, play]);

  const { showInterstitialAd, isInterstitialAdVisible } =
    useShowInterstitialAd();

  useEffect(() => {
    if (hasVideo && !isInterstitialAdVisible && isLoading) play();
  }, [hasVideo, isInterstitialAdVisible, isLoading, play]);

  return {
    hasVideo,
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
    unloadVideo,
    toggleVideoPlayerMode,
    toggleResizeMode,
    clearError: useCallback(() => setErrorLoadingVideo(false), []),
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
          setIsLoading(true);

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
          setCurrentVideoPositionInMillis(0);
        }
      },
      [unloadVideo, videoPlayer.load, showInterstitialAd]
    ),
  };
};

const usePlayerMode = () => {
  const [videoPlayerMode, setVideoPlayerMode] = useState(PLAYER_MODES.VR_VIDEO);

  useEffect(() => {
    playerMode.load().then((savedPlayerMode) => {
      if (savedPlayerMode) setVideoPlayerMode(savedPlayerMode);
    });
  }, []);

  return {
    videoPlayerMode,
    toggleVideoPlayerMode: useCallback(async () => {
      const nextPlayerMode =
        videoPlayerMode === PLAYER_MODES.VR_VIDEO
          ? PLAYER_MODES.NORMAL_VIDEO
          : PLAYER_MODES.VR_VIDEO;

      setVideoPlayerMode(nextPlayerMode);
      await playerMode.save(nextPlayerMode);
    }, [videoPlayerMode]),
  };
};

const usePlayerResizeMode = () => {
  const [videoResizeMode, setResizeMode] = useState(
    RESIZE_MODES.RESIZE_MODE_COVER
  );

  useEffect(() => {
    resizeMode.load().then((savedResizeMode) => {
      if (savedResizeMode) setResizeMode(savedResizeMode);
    });
  }, []);

  return {
    videoResizeMode,
    toggleResizeMode: useCallback(async () => {
      const nextResizeMode = getNextResizeMode(videoResizeMode);
      setResizeMode(nextResizeMode);
      await resizeMode.save(nextResizeMode);
    }, [videoResizeMode]),
  };
};

const getNextResizeMode = (currentResizeMode) => {
  const currentIndex = resizeModesToggleOrder.findIndex(
    (mode) => mode === currentResizeMode
  );

  const nextIndex = currentIndex + 1;

  return resizeModesToggleOrder[
    nextIndex >= resizeModesToggleOrder.length ? 0 : nextIndex
  ];
};

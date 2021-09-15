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
  const [error, setError] = useState(false);

  const [currentVideoPositionInMillis, setCurrentVideoPositionInMillis] =
    useState(0);

  const [videoDuration, setVideoDuration] = useState(null);

  const play = useCallback(async () => {
    if (hasVideo) {
      try {
        setIsLoading(false);
        setIsPlaying(true);
        await videoPlayer.play();
        return { error: null };
      } catch (error) {
        logError(error);
        setError("there was an issue trying to start the video");
        return { error };
      }
    }
  }, [hasVideo, videoPlayer.play]);

  const pause = useCallback(async () => {
    if (hasVideo) {
      try {
        setIsPlaying(false);
        await videoPlayer.pause();
        return { error: null };
      } catch (error) {
        logError(error);
        setError("there was an issue trying to pause the video");
        return { error };
      }
    }
  }, [hasVideo, videoPlayer.pause]);

  const setPosition = useCallback(
    async (position) => {
      const positionToSet =
        position && Math.max(Math.min(position, videoDuration), 0);
      if (!hasVideo || isNil(positionToSet)) return;

      try {
        await videoPlayer.setPosition(positionToSet);
        setCurrentVideoPositionInMillis(positionToSet);
        return { error: null };
      } catch (error) {
        logError(error);
        setError("there was an issue trying to update the video position");
        return { error };
      }
    },
    [hasVideo, videoPlayer.setPosition, videoDuration]
  );

  const unloadVideo = useCallback(async () => {
    if (!hasVideo) return;
    try {
      await videoPlayer.unload();

      setVideoDuration(0);
      setHasVideo(null);
      setIsPlaying(false);
      setCurrentVideoPositionInMillis(0);
      return { error: null };
    } catch (error) {
      logError(error);
      setError("there was an issue removing the current video");
      return { error };
    }
  }, [videoPlayer.unload, hasVideo]);

  useEffect(() => {
    if (isPlaying && hasVideo) {
      const interval = setInterval(() => {
        videoPlayer
          .getStatus()
          .then(async ({ primaryStatus, secondaryStatus }) => {
            if (!primaryStatus || !secondaryStatus) return;

            // Ensure the two videos are playing if the primary is
            if (primaryStatus.isPlaying && !secondaryStatus.isPlaying) {
              await play();
            }

            // Resync the two video players if required
            if (!arePlayerInSync(primaryStatus, secondaryStatus)) {
              await resyncVideos(
                videoPlayer,
                primaryStatus,
                secondaryStatus,
                setPosition
              );
            }

            // Update the known video position
            if (!isNil(primaryStatus.positionMillis) && isPlaying) {
              setCurrentVideoPositionInMillis(primaryStatus.positionMillis);
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
    currentVideoPositionInMillis,
    videoDuration,
    leftPlayer: videoPlayer.refs.primaryVideo,
    rightPlayer: videoPlayer.refs.secondaryVideo,
    errorUnloadingVideo: error,
    videoPlayerMode,
    videoResizeMode,
    error,
    play,
    pause,
    setPosition,
    setDisplayPosition: setCurrentVideoPositionInMillis,
    unloadVideo,
    toggleVideoPlayerMode,
    toggleResizeMode,
    loadVideoSource: useCallback(
      async (newFileObject) => {
        if (newFileObject.type === "cancel") return;

        try {
          await unloadVideo();

          // Load video
          // Set hasVideo early to ensure the correct pages are shown while the videos are loading
          setHasVideo(true);
          await videoPlayer.load(newFileObject, {
            primaryOptions: {
              isLooping: true,
            },
            secondaryOptions: {
              isMuted: true,
              isLooping: true,
            },
          });
          setIsLoading(true);

          const {
            primaryStatus: { durationMillis },
          } = await videoPlayer.getStatus();
          setVideoDuration(durationMillis);

          await showInterstitialAd();

          setCurrentVideoPositionInMillis(0);
        } catch (error) {
          logError(error);
          setError(`unable to load ${newFileObject.filename}`);
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

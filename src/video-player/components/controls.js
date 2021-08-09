import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Text,
  TouchableWithoutFeedback,
} from "react-native";
import { useSelectVideoAndShowInterstitialAds } from "../hooks/use-select-video-and-show-interstitial-ads";
import { ControlBar } from "./control-bar";
import { ControlBarIconButton } from "./control-bar-icon-button";
import { AdBanner } from "./control-views/ad-banner";
import { ErrorView } from "./control-views/error-view";
import { HomeView } from "./control-views/home-view";
import { TimeBar } from "./time-bar";
import {
  millisecondsToTime,
  togglePlayerModeButtonIconName,
  toggleResizeModeButtonIconName,
} from "./utils";
import { homeViewAdBannerId } from "../../../secrets.json";
import { checkIfAdsDisabled, disableAds } from "../ads";

export const Controls = ({ videoPlayer, zIndex }) => {
  const { areAdsDisabled, setAreAdsDisabled } = useCanShowAds();
  const [manualPositionInMillis, setManualPositionInMillis] = useState(null);
  const [shouldUseManualPosition, setShouldUseManualPosition] = useState(false);
  const [shouldResume, setShouldResume] = useState(false);
  const { fadeAnim, showControls } = useShowControls(videoPlayer);

  const selectVideoAndShowAds = useSelectVideoAndShowInterstitialAds(
    videoPlayer,
    areAdsDisabled
  );

  useEffect(() => {
    const backhander = BackHandler.addEventListener("hardwareBackPress", () => {
      if (videoPlayer.isLoaded) videoPlayer.unloadVideo();
      return videoPlayer.isLoaded;
    });
    return () => backhander.remove();
  }, [videoPlayer.isLoaded]);

  const shouldShowErrorMessage = videoPlayer.errorLoadingVideo;
  const shouldShowDefaultPage =
    !shouldShowErrorMessage && !videoPlayer.hasVideo;
  const shouldDisableLowerBarControls =
    shouldShowErrorMessage || shouldShowDefaultPage || videoPlayer.isLoading;

  return (
    <TouchableWithoutFeedback
      style={{
        opacity: fadeAnim,
        height: "100%",
        width: "100%",
        zIndex,
      }}
      onPress={showControls}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          height: "100%",
          width: "100%",
          justifyContent: videoPlayer.errorLoadingVideo
            ? "flex-start"
            : "space-between",
        }}
      >
        <UpperControlBar
          onPressAnyControls={showControls}
          onPressBack={() => {
            videoPlayer.unloadVideo();
            videoPlayer.clearError();
          }}
          onPressSelectVideo={selectVideoAndShowAds}
        />
        {shouldShowDefaultPage && (
          <HomeView
            onPressSelectVideo={selectVideoAndShowAds}
            onDisableAds={async () => {
              setAreAdsDisabled(true);
              await disableAds();
            }}
          />
        )}
        {shouldShowErrorMessage && (
          <ErrorView
            errorMessage={videoPlayer.errorLoadingVideo}
            onPressSelectAnotherVideo={selectVideoAndShowAds}
          />
        )}
        {!areAdsDisabled && !videoPlayer.hasVideo && (
          <AdBanner adUnitID={homeViewAdBannerId} />
        )}
        <LowerControlBar
          shouldDisableControls={shouldDisableLowerBarControls}
          onPressAnyControls={showControls}
          isPlaying={videoPlayer.isPlaying}
          videoDuration={videoPlayer.videoDuration}
          currentVideoPositionInMillis={
            // Use manual position while user select a position with the time bar.
            // It produces a smoother experience
            shouldUseManualPosition
              ? manualPositionInMillis
              : videoPlayer.currentVideoPositionInMillis
          }
          videoPlayerMode={videoPlayer.videoPlayerMode}
          videoResizeMode={videoPlayer.videoResizeMode}
          onPressPlay={() =>
            videoPlayer.isPlaying ? videoPlayer.pause() : videoPlayer.play()
          }
          onSeekVideoPositionStart={(newPosition) => {
            setShouldUseManualPosition(true);

            setManualPositionInMillis(newPosition);

            if (videoPlayer.isPlaying) {
              videoPlayer.pause();
              setShouldResume(true);
            }
          }}
          onSeekVideoPosition={(newPosition) => {
            setManualPositionInMillis(newPosition);
          }}
          onSeekVideoPositionComplete={async (newPosition) => {
            setManualPositionInMillis(newPosition);
            await videoPlayer.setPosition(newPosition);

            setShouldUseManualPosition(false);

            if (shouldResume) videoPlayer.play();
            setShouldResume(false);
          }}
          togglePlayerMode={() => videoPlayer.toggleVideoMode()}
          togglePlayerResizeMode={() => videoPlayer.toggleResizeMode()}
        />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const useShowControls = (videoPlayer) => {
  const [areControlsVisible, setAreControlsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showControls = useCallback(() => {
    fadeAnim.setValue(1);
    setAreControlsVisible(true);
  }, [fadeAnim?.current]);

  useEffect(() => {
    if (areControlsVisible && videoPlayer.isPlaying) {
      const timeout = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          setAreControlsVisible(false);
        });
      }, 7000);
      return () => clearTimeout(timeout);
    }
  }, [areControlsVisible, videoPlayer.isPlaying]);

  useEffect(() => {
    if (!videoPlayer.isPlaying) showControls();
  }, [showControls, videoPlayer.isPlaying]);

  return {
    fadeAnim,
    showControls,
  };
};

const useCanShowAds = () => {
  const [areAdsDisabled, setAreAdsDisabled] = useState(false);

  useEffect(() => {
    // Check if ads are disabled on mount
    checkIfAdsDisabled().then(setAreAdsDisabled);
  }, []);

  useEffect(() => {
    // If ads are disabled check every 30 seconds if they are now enabled
    if (areAdsDisabled) {
      const interval = setInterval(() => {
        checkIfAdsDisabled().then((areDisabled) => {
          if (areDisabled) return;
          setAreAdsDisabled(false);
        });
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [areAdsDisabled]);

  return { areAdsDisabled, setAreAdsDisabled };
};

const UpperControlBar = ({
  onPressBack,
  onPressAnyControls,
  onPressSelectVideo,
}) => {
  return (
    <ControlBar
      style={{
        justifyContent: "space-between",
      }}
    >
      <ControlBarIconButton
        name="backArrow"
        onPress={() => {
          onPressBack();
          onPressAnyControls();
        }}
      />
      <ControlBarIconButton
        name="folderVideo"
        onPress={() => {
          onPressSelectVideo();
          onPressAnyControls();
        }}
      />
    </ControlBar>
  );
};

const LowerControlBar = ({
  shouldDisableControls,
  isPlaying,
  onPressPlay,
  onPressAnyControls,
  videoDuration,
  onSeekVideoPositionStart,
  onSeekVideoPosition,
  onSeekVideoPositionComplete,
  currentVideoPositionInMillis,
  togglePlayerMode,
  videoPlayerMode,
  videoResizeMode,
  togglePlayerResizeMode,
}) => {
  return (
    <ControlBar
      style={{
        justifyContent: "space-between",
        opacity: shouldDisableControls ? 0.25 : 1,
      }}
    >
      <ControlBarIconButton
        disabled={shouldDisableControls}
        name={isPlaying ? "pause" : "play"}
        onPress={() => {
          onPressPlay();
          onPressAnyControls();
        }}
      />
      <Text style={{ color: "white", fontWeight: "bold", fontSize: 17 }}>
        {millisecondsToTime(currentVideoPositionInMillis)}
      </Text>
      <TimeBar
        disabled={shouldDisableControls}
        currentPosition={currentVideoPositionInMillis}
        videoDuration={videoDuration}
        onSeekVideoPositionStart={(newValue) => {
          onSeekVideoPositionStart(newValue);
          onPressAnyControls();
        }}
        onSeekVideoPosition={(newValue) => {
          onSeekVideoPosition(newValue);
          onPressAnyControls();
        }}
        onSeekVideoPositionComplete={onSeekVideoPositionComplete}
      />
      <ControlBarIconButton
        disabled={shouldDisableControls}
        name={togglePlayerModeButtonIconName(videoPlayerMode)}
        onPress={() => {
          togglePlayerMode();
          onPressAnyControls();
        }}
      />
      <ControlBarIconButton
        disabled={shouldDisableControls}
        name={toggleResizeModeButtonIconName(videoResizeMode)}
        onPress={() => {
          togglePlayerResizeMode();
          onPressAnyControls();
        }}
      />
    </ControlBar>
  );
};

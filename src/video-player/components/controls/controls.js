import React, { useState } from "react";
import { useEffect } from "react";
import { View } from "react-native";
import { Animated, Text, TouchableWithoutFeedback } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { homeViewAdBannerId } from "../../../../secrets.json";
import { Icon } from "../../../icon";
import { useSelectVideoAndShowInterstitialAds } from "../../hooks/use-select-video-and-show-interstitial-ads";
import { ControlBar } from "../control-bar";
import { ControlBarIconButton } from "../control-bar-icon-button";
import { TimeBar } from "../time-bar";
import {
  millisecondsToTime,
  togglePlayerModeButtonIconName,
  toggleResizeModeButtonIconName,
} from "../utils";
import { AdBanner } from "./control-views/ad-banner";
import { DisableAdsView } from "./control-views/disable-ads-view";
import { ErrorView } from "./control-views/error-view";
import { HomeView } from "./control-views/home-view";
import { useCanShowAds } from "./hooks/use-can-show-ads";
import { useShowControls } from "./hooks/use-show-controls";
import { useViewToShow } from "./hooks/use-view-to-show";

export const Controls = ({ videoPlayer, zIndex }) => {
  const { areAdsDisabled, setAreAdsDisabled } = useCanShowAds();
  const [manualPositionInMillis, setManualPositionInMillis] = useState(null);
  const [shouldUseManualPosition, setShouldUseManualPosition] = useState(false);
  const [shouldResume, setShouldResume] = useState(false);
  const { fadeAnim, showControls } = useShowControls(videoPlayer);

  const {
    shouldShowErrorView,
    shouldShowDisableAdsView,
    shouldShowHomeView,
    setShowDisableAdsView,
  } = useViewToShow(videoPlayer);

  const shouldDisableVideoControls =
    shouldShowErrorView || !videoPlayer.hasVideo;

  const selectVideoAndShowAds = useSelectVideoAndShowInterstitialAds(
    videoPlayer,
    areAdsDisabled
  );

  const [timeToSkipTo, setTimeToSkipTo] = useState(null);
  useEffect(() => {
    if (timeToSkipTo) {
      const timeout = setTimeout(async () => {
        await videoPlayer.setPosition(timeToSkipTo);
        await videoPlayer.play();
        setTimeToSkipTo(null);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [timeToSkipTo, videoPlayer.videoDuration]);

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
          shouldDisableControls={shouldShowHomeView}
          onPressAnyControls={showControls}
          onPressBack={() => {
            videoPlayer.unloadVideo();
            videoPlayer.clearError();
            setShowDisableAdsView(false);
          }}
          onPressSelectVideo={selectVideoAndShowAds}
        />
        <View style={{ width: "100%", flex: 1, flexDirection: "row" }}>
          <SideControlBar
            left
            shouldDisableControls={shouldDisableVideoControls}
            onPress={async () => {
              showControls();
              if (videoPlayer.isPlaying) await videoPlayer.pause();
              setTimeToSkipTo((currentSkipTime) =>
                currentSkipTime
                  ? currentSkipTime - 10000
                  : videoPlayer.currentVideoPositionInMillis - 10000
              );
            }}
          >
            <Icon name="replay" color="white" size={30} />
          </SideControlBar>
          <View style={{ flex: 1, alignItems: "center" }}>
            {shouldShowHomeView && (
              <HomeView
                onPressSelectVideo={selectVideoAndShowAds}
                onPressDisableAds={async () => setShowDisableAdsView(true)}
              />
            )}
            {shouldShowErrorView && (
              <ErrorView
                errorMessage={videoPlayer.errorLoadingVideo}
                onPressSelectAnotherVideo={selectVideoAndShowAds}
              />
            )}
            {shouldShowDisableAdsView && (
              <DisableAdsView
                areAdsDisabled={areAdsDisabled}
                onDisableAds={async () => {
                  setShowDisableAdsView(false);
                  setAreAdsDisabled(true);
                }}
              />
            )}
            {!areAdsDisabled && !videoPlayer.hasVideo && (
              <AdBanner adUnitID={homeViewAdBannerId} />
            )}
          </View>
          <SideControlBar
            right
            shouldDisableControls={shouldDisableVideoControls}
            onPress={async () => {
              showControls();
              if (videoPlayer.isPlaying) await videoPlayer.pause();
              setTimeToSkipTo((currentSkipTime) =>
                currentSkipTime
                  ? currentSkipTime + 10000
                  : videoPlayer.currentVideoPositionInMillis + 10000
              );
            }}
          >
            <Icon name="forward" color="white" size={30} />
          </SideControlBar>
        </View>
        <LowerControlBar
          shouldDisableControls={shouldDisableVideoControls}
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

const UpperControlBar = ({
  onPressBack,
  onPressAnyControls,
  onPressSelectVideo,
  shouldDisableControls,
}) => {
  return (
    <ControlBar>
      <ControlBarIconButton
        name="backArrow"
        onPress={() => {
          onPressBack();
          onPressAnyControls();
        }}
        disabled={shouldDisableControls}
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

const SideControlBar = ({
  left,
  right,
  children,
  shouldDisableControls,
  onPress,
}) => (
  <View
    style={{
      opacity: shouldDisableControls ? 0.25 : 1,
      justifyContent: "center",
      height: "100%",
    }}
  >
    <TouchableOpacity
      style={{
        justifyContent: "center",
        height: "100%",
      }}
      onPress={onPress}
      disabled={shouldDisableControls}
    >
      <View
        style={{
          justifyContent: "center",
          backgroundColor: "#00000080",
          height: "50%",
          padding: 10,
          ...sideBarBorderRadius({ left, right }),
        }}
      >
        {children}
      </View>
    </TouchableOpacity>
  </View>
);

const sideBarBorderRadius = ({ left, right }) => {
  if (left) {
    return {
      borderTopRightRadius: 50,
      borderBottomRightRadius: 50,
    };
  }

  if (right) {
    return {
      borderTopLeftRadius: 50,
      borderBottomLeftRadius: 50,
    };
  }
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

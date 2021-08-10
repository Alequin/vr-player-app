import React, { useState } from "react";
import { Animated, Text, TouchableWithoutFeedback } from "react-native";
import { homeViewAdBannerId } from "../../../../secrets.json";
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
    shouldDisableLowerBarControls,
    setShowDisableAdsView,
  } = useViewToShow(videoPlayer);

  const selectVideoAndShowAds = useSelectVideoAndShowInterstitialAds(
    videoPlayer,
    areAdsDisabled
  );

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
            setShowDisableAdsView(false);
          }}
          onPressSelectVideo={selectVideoAndShowAds}
        />
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

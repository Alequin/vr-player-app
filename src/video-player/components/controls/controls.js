import React, { useState } from "react";
import { Animated, Text, TouchableWithoutFeedback, View } from "react-native";
import { Icon } from "../../../icon";
import { useSelectVideo } from "../../hooks/use-select-video";
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
import { SideControlBar } from "./side-control-bar";

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

  const selectVideo = useSelectVideo(videoPlayer);

  return (
    <Animated.View
      style={{
        zIndex,
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
        onPressSelectVideo={selectVideo}
      />
      <View style={{ width: "100%", flex: 1, flexDirection: "row" }}>
        <SideControlBar
          testID="sidebarLeft"
          left
          shouldDisableControls={shouldDisableVideoControls}
          onPress={async () => {
            showControls();
            const shouldPause = videoPlayer.isPlaying;
            const newPosition =
              videoPlayer.currentVideoPositionInMillis - 10000;

            if (shouldPause) await videoPlayer.pause();
            await videoPlayer.setPosition(newPosition);
            if (shouldPause) await videoPlayer.play();
          }}
        >
          <Icon name="replay" color="white" size={30} />
        </SideControlBar>
        <View style={{ flex: 1, alignItems: "center" }}>
          {shouldShowHomeView && (
            <HomeView
              onPressSelectVideo={async () => await selectVideo()}
              onPressDisableAds={async () => setShowDisableAdsView(true)}
            />
          )}
          {shouldShowErrorView && (
            <ErrorView
              errorMessage={videoPlayer.errorLoadingVideo}
              onPressSelectAnotherVideo={selectVideo}
            />
          )}
          {shouldShowDisableAdsView && (
            <DisableAdsView onDisableAds={() => setAreAdsDisabled(true)} />
          )}
          {!areAdsDisabled && !videoPlayer.hasVideo && <AdBanner />}
          {videoPlayer.hasVideo && (
            <TouchableWithoutFeedback
              style={{
                height: "100%",
                width: "100%",
              }}
              onPress={showControls}
            >
              <View
                style={{
                  height: "100%",
                  width: "100%",
                }}
              />
            </TouchableWithoutFeedback>
          )}
        </View>
        <SideControlBar
          testID="sidebarRight"
          right
          shouldDisableControls={shouldDisableVideoControls}
          onPress={async () => {
            showControls();
            const shouldPause = videoPlayer.isPlaying;
            const newPosition =
              videoPlayer.currentVideoPositionInMillis + 10000;

            if (shouldPause) await videoPlayer.pause();
            await videoPlayer.setPosition(newPosition);
            if (shouldPause) await videoPlayer.play();
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
        togglePlayerMode={async () => videoPlayer.toggleVideoPlayerMode()}
        togglePlayerResizeMode={async () => videoPlayer.toggleResizeMode()}
      />
    </Animated.View>
  );
};

const UpperControlBar = ({
  onPressBack,
  onPressAnyControls,
  onPressSelectVideo,
  shouldDisableControls,
}) => {
  return (
    <ControlBar testID="upperControlBar">
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
      testID="lowerControlBar"
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
      <Text
        style={{ color: "white", fontWeight: "bold", fontSize: 17, margin: 5 }}
      >
        {millisecondsToTime(currentVideoPositionInMillis, videoDuration)}
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

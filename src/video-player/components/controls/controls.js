import isEmpty from "lodash/isEmpty";
import React, { useState } from "react";
import { Animated, Text, TouchableWithoutFeedback, View } from "react-native";
import { Icon } from "../../../icon";
import { isAtLeastAnHour } from "../../../is-at-least-an-hour";
import { disabledElementOpacity } from "../../disabld-element-opacity";
import { useLoadVideoOptions } from "../../hooks/use-load-video-options";
import { ControlBar } from "../control-bar";
import { ControlBarIconButton } from "../control-bar-icon-button";
import { TimeBar } from "../time-bar";
import {
  millisecondsToTime,
  millisecondsToTimeWithoutHours,
  togglePlayerModeButtonIconName,
  toggleResizeModeButtonIconName,
} from "../utils";
import { AdBanner } from "./control-views/ad-banner";
import { DisableAdsView } from "./control-views/disable-ads-view";
import { HomeView } from "./control-views/home-view";
import { RequestPermissionsView } from "./control-views/request-permissions-view";
import { SelectVideoView } from "./control-views/select-video-view";
import { useCanShowAds } from "./hooks/use-can-show-ads";
import { useMediaLibraryPermissions } from "./hooks/use-media-library-permissions";
import { useSelectVideoSortOrder } from "./hooks/use-select-video-sort-order";
import { useShowControls } from "./hooks/use-show-controls";
import { useViewToShow } from "./hooks/use-view-to-show";
import { SideControlBar } from "./side-control-bar";
import { SortOrderButton } from "./sort-order-button";

export const Controls = ({ videoPlayer, zIndex }) => {
  const { hasPermission, canAskPermissionInApp, askForMediaLibraryPermission } =
    useMediaLibraryPermissions();

  const { videoSortInstructions, toggleVideoSortInstructions } =
    useSelectVideoSortOrder();
  const { videoOptions, reloadVideoOptions, didLoadingVideoOptionsError } =
    useLoadVideoOptions(hasPermission, videoSortInstructions);

  const { areAdsDisabled, setAreAdsDisabled } = useCanShowAds();

  const [manualPositionInMillis, setManualPositionInMillis] = useState(null);
  const [shouldUseManualPosition, setShouldUseManualPosition] = useState(false);
  const [shouldResume, setShouldResume] = useState(false);
  const { fadeAnim, showControls } = useShowControls(videoPlayer);

  const {
    shouldShowRequestPermissionsView,
    shouldShowDisableAdsView,
    shouldShowSelectVideoView,
    shouldShowHomeView,
    goToDisableAdsView,
    goToSelectVideoView,
    onBackEvent,
  } = useViewToShow(videoPlayer, hasPermission);

  const shouldDisableVideoControls = !videoPlayer.hasVideo;

  return (
    <Animated.View
      style={{
        zIndex,
        opacity: fadeAnim,
        height: "100%",
        width: "100%",
        justifyContent: "space-between",
      }}
    >
      <ControlBar testID="upperControlBar">
        <View style={{ flexDirection: "row", flex: 20 }}>
          <ControlBarIconButton
            name="backArrow"
            onPress={() => {
              onBackEvent();
              showControls();
            }}
            disabled={shouldShowHomeView || shouldShowRequestPermissionsView}
          />
        </View>
        <View style={{ flexDirection: "row", flex: 60 }}>
          {shouldShowSelectVideoView && (
            <SortOrderButton
              style={{
                flex: 60,
              }}
              onPress={() => {
                toggleVideoSortInstructions();
                showControls();
              }}
              disabled={didLoadingVideoOptionsError || isEmpty(videoOptions)}
              text={videoSortInstructions.description}
            />
          )}
        </View>
        <View
          style={{ flexDirection: "row", flex: 20, justifyContent: "flex-end" }}
        >
          {shouldShowSelectVideoView && (
            <>
              <ControlBarIconButton
                name="playlist"
                onPress={videoPlayer.toggleIsPlaylistActive}
                disabled={didLoadingVideoOptionsError || isEmpty(videoOptions)}
              />
              <ControlBarIconButton
                name="refresh"
                onPress={() => {
                  reloadVideoOptions();
                  showControls();
                }}
              />
            </>
          )}
          {!shouldShowSelectVideoView && (
            <ControlBarIconButton
              name="folderVideo"
              onPress={() => {
                goToSelectVideoView();
                showControls();
              }}
              disabled={shouldShowRequestPermissionsView}
            />
          )}
        </View>
      </ControlBar>
      <View style={{ width: "100%", flex: 1, flexDirection: "row" }}>
        {videoPlayer.hasVideo && (
          <SideControlBar
            testID="sidebarLeft"
            left
            shouldDisableControls={shouldDisableVideoControls}
            onPress={async () => {
              showControls();
              await videoPlayer.setPosition(
                videoPlayer.currentVideoPositionInMillis - 10000
              );
            }}
          >
            <Icon name="replay" color="white" size={30} />
          </SideControlBar>
        )}
        <View style={{ flex: 1, alignItems: "center" }}>
          {shouldShowRequestPermissionsView && (
            <RequestPermissionsView
              shouldDirectUserToSettings={!canAskPermissionInApp}
              onPress={askForMediaLibraryPermission}
            />
          )}
          {shouldShowHomeView && (
            <HomeView
              onPressSelectVideo={goToSelectVideoView}
              onPressDisableAds={goToDisableAdsView}
            />
          )}
          {shouldShowDisableAdsView && (
            <DisableAdsView onDisableAds={() => setAreAdsDisabled(true)} />
          )}
          {shouldShowSelectVideoView && (
            <SelectVideoView
              videoOptions={videoOptions}
              onPressReloadVideoOptions={reloadVideoOptions}
              didLoadingVideoOptionsError={didLoadingVideoOptionsError}
              isPlaylistActive={videoPlayer.isPlaylistActive}
              videosInPlaylist={videoPlayer.videosInPlaylist}
              addVideoToPlaylist={videoPlayer.addVideoToPlaylist}
              removeVideoFromPlaylist={videoPlayer.removeVideoFromPlaylist}
              moveVideoPositionUp={videoPlayer.moveVideoPositionUp}
              moveVideoPositionDown={videoPlayer.moveVideoPositionDown}
              startVideo={videoPlayer.startVideo}
              startPlaylist={videoPlayer.startPlaylist}
            />
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
        {videoPlayer.hasVideo && (
          <SideControlBar
            testID="sidebarRight"
            right
            shouldDisableControls={shouldDisableVideoControls}
            onPress={async () => {
              showControls();
              await videoPlayer.setPosition(
                videoPlayer.currentVideoPositionInMillis + 10000
              );
            }}
          >
            <Icon name="forward" color="white" size={30} />
          </SideControlBar>
        )}
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
        onPressPlay={async () => {
          if (!videoPlayer.isPlaying) return await videoPlayer.play();

          await videoPlayer.pause();
          await videoPlayer.setPosition(
            videoPlayer.currentVideoPositionInMillis
          );
        }}
        onSeekVideoPositionStart={async (newPosition) => {
          setShouldUseManualPosition(true);

          setManualPositionInMillis(newPosition);

          if (videoPlayer.isPlaying) {
            setShouldResume(true);
            await videoPlayer.pause();
          }
        }}
        onSeekVideoPosition={(newPosition) =>
          setManualPositionInMillis(newPosition)
        }
        onSeekVideoPositionComplete={async (newPosition) => {
          setManualPositionInMillis(newPosition);
          const { error } = await videoPlayer.setPosition(newPosition);
          if (error) return;

          setShouldUseManualPosition(false);

          setShouldResume(false);
          if (shouldResume) await videoPlayer.play();
        }}
        togglePlayerMode={async () => videoPlayer.toggleVideoPlayerMode()}
        togglePlayerResizeMode={async () => videoPlayer.toggleResizeMode()}
      />
    </Animated.View>
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
    <ControlBar testID="lowerControlBar">
      <ControlBarIconButton
        disabled={shouldDisableControls}
        name={isPlaying ? "pause" : "play"}
        onPress={() => {
          onPressPlay();
          onPressAnyControls();
        }}
      />
      <Text
        style={{
          color: "white",
          fontWeight: "bold",
          fontSize: 17,
          margin: 5,
          opacity: disabledElementOpacity(shouldDisableControls),
        }}
      >
        {isAtLeastAnHour(videoDuration)
          ? millisecondsToTime(currentVideoPositionInMillis)
          : millisecondsToTimeWithoutHours(currentVideoPositionInMillis)}
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

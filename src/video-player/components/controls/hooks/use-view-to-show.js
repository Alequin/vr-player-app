import filter from "lodash/filter";
import { useCallback, useEffect, useState } from "react";
import { BackHandler } from "react-native";

export const useViewToShow = (videoPlayer, hasPermission) => {
  const [showDisableAdsView, setShowDisableAdsView] = useState(false);

  const [showSelectVideoView, setSelectVideoView] = useState(false);

  const viewStates = getViewStates(
    videoPlayer,
    hasPermission,
    showDisableAdsView,
    showSelectVideoView
  );

  if (isMoreThanOneKeyTruthy(viewStates))
    throw new Error("Only one control view should be visible at any one time");

  const returnToHomeView = useCallback(() => {
    // Unload a video if one is active to close the video player
    if (videoPlayer.hasVideo) videoPlayer.unloadVideo();
    // Set all stateful views to false
    if (showDisableAdsView) setShowDisableAdsView(false);
    if (showSelectVideoView) setSelectVideoView(false);
  }, [videoPlayer.hasVideo, showDisableAdsView, showSelectVideoView]);

  const goToDisableAdsView = useCallback(() => {
    returnToHomeView();
    setShowDisableAdsView(true);
  }, [returnToHomeView]);

  const goToSelectVideoView = useCallback(() => {
    returnToHomeView();
    setSelectVideoView(true);
  }, [returnToHomeView]);

  const onBackEvent = useCallback(() => {
    // return to video select page if a video is playing
    if (videoPlayer.hasVideo) {
      goToSelectVideoView();
      return true;
    }
    // return to home view in all other situations
    if (!videoPlayer.hasVideo && !viewStates.shouldShowHomeView) {
      returnToHomeView();
      return true;
    }

    return false;
  }, [
    returnToHomeView,
    goToSelectVideoView,
    viewStates.shouldShowHomeView,
    videoPlayer.hasVideo,
  ]);

  useEffect(() => {
    const backhander = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackEvent
    );
    return () => backhander.remove();
  }, [onBackEvent]);

  return {
    ...viewStates,
    goToDisableAdsView,
    goToSelectVideoView,
    onBackEvent,
  };
};

const isMoreThanOneKeyTruthy = (...values) =>
  filter(values, Boolean).length > 1;

const getViewStates = (
  { hasVideo },
  hasPermission,
  showDisableAdsView,
  showSelectVideoView
) => {
  const shouldShowRequestPermissionsView = !hasPermission;

  const shouldShowDisableAdsView = showDisableAdsView && !hasVideo;
  const shouldShowSelectVideoView = showSelectVideoView && !hasVideo;
  const shouldShowHomeView =
    !hasVideo &&
    !showDisableAdsView &&
    !showSelectVideoView &&
    !shouldShowRequestPermissionsView;

  return {
    shouldShowRequestPermissionsView,
    shouldShowDisableAdsView,
    shouldShowSelectVideoView,
    shouldShowHomeView,
  };
};

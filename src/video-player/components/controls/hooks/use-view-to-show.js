import filter from "lodash/filter";
import { useCallback, useEffect, useState } from "react";
import { BackHandler } from "react-native";

export const useViewToShow = (videoPlayer) => {
  const [showDisableAdsView, setShowDisableAdsView] = useState(false);

  const [showSelectVideoView, setSelectVideoView] = useState(false);

  const viewStates = getViewStates(
    videoPlayer,
    showDisableAdsView,
    showSelectVideoView
  );

  if (isMoreThanOneKeyTruthy(viewStates))
    throw new Error("Only one control view should be visible at any one time");

  const returnToHomeView = useCallback(async () => {
    // Unload a video if one is active to close the video player
    if (videoPlayer.hasVideo) await videoPlayer.unloadVideo();
    // Clear any errors to close the error page
    if (viewStates.shouldShowErrorView) videoPlayer.clearError();
    // Set all stateful views to false
    if (showDisableAdsView) setShowDisableAdsView(false);
    if (showSelectVideoView) setSelectVideoView(false);
  }, [
    videoPlayer.hasVideo,
    viewStates.shouldShowErrorView,
    showDisableAdsView,
    showSelectVideoView,
  ]);

  useEffect(() => {
    const backhander = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!viewStates.shouldShowHomeView) returnToHomeView();
      return !viewStates.shouldShowHomeView;
    });
    return () => backhander.remove();
  }, [returnToHomeView, viewStates.shouldShowHomeView]);

  return {
    ...viewStates,
    returnToHomeView,
    showDisableAdsView: useCallback(async () => {
      await returnToHomeView();
      setShowDisableAdsView(true);
    }, [returnToHomeView]),
    showSelectVideoView: useCallback(async () => {
      await returnToHomeView();
      setSelectVideoView(true);
    }, [returnToHomeView]),
  };
};

const isMoreThanOneKeyTruthy = (...values) =>
  filter(values, Boolean).length > 1;

const getViewStates = (
  { hasVideo, errorLoadingVideo },
  showDisableAdsView,
  showSelectVideoView
) => {
  const shouldShowErrorView = errorLoadingVideo;
  const shouldShowDisableAdsView =
    showDisableAdsView && !shouldShowErrorView && !hasVideo;
  const shouldShowSelectVideoView =
    showSelectVideoView && !shouldShowErrorView && !hasVideo;
  const shouldShowHomeView =
    !hasVideo &&
    !shouldShowErrorView &&
    !showDisableAdsView &&
    !showSelectVideoView;

  return {
    shouldShowErrorView,
    shouldShowDisableAdsView,
    shouldShowSelectVideoView,
    shouldShowHomeView,
  };
};

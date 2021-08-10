import { useEffect, useState } from "react";
import { BackHandler } from "react-native";

export const useViewToShow = (videoPlayer) => {
  const shouldShowErrorView = videoPlayer.errorLoadingVideo;

  const [showDisableAdsView, setShowDisableAdsView] = useState(false);
  const shouldShowDisableAdsView =
    !shouldShowErrorView && showDisableAdsView && !videoPlayer.hasVideo;

  const shouldShowHomeView =
    !shouldShowDisableAdsView && !shouldShowErrorView && !videoPlayer.hasVideo;

  const shouldDisableLowerBarControls =
    shouldShowErrorView || !videoPlayer.hasVideo;

  useEffect(() => {
    const backhander = BackHandler.addEventListener("hardwareBackPress", () => {
      if (videoPlayer.isLoaded) {
        videoPlayer.unloadVideo();
        return true;
      }

      if (shouldShowErrorView) {
        videoPlayer.clearError();
        return true;
      }

      if (showDisableAdsView) {
        setShowDisableAdsView(false);
        return true;
      }
    });
    return () => backhander.remove();
  }, [videoPlayer.isLoaded]);

  return {
    shouldShowErrorView,
    shouldShowDisableAdsView,
    shouldShowHomeView,
    shouldDisableLowerBarControls,
    setShowDisableAdsView,
  };
};

import { AdMobInterstitial } from "expo-ads-admob";
import * as DocumentPicker from "expo-document-picker";
import { useCallback, useEffect } from "react";
import { videoSelectAdId } from "../../../secrets.json";

export const useSelectVideoAndShowInterstitialAds = (videoPlayer) => {
  useEffect(() => {
    prepareAds();
  }, []);

  return useCallback(async () => {
    videoPlayer.clearError();
    try {
      // Show ads
      const hasAdReadyToShow = await AdMobInterstitial.getIsReadyAsync();
      if (!hasAdReadyToShow) await AdMobInterstitial.requestAdAsync();
      await AdMobInterstitial.showAdAsync();
    } catch (error) {
      // Swallow error. A failure to show an ad should not interrupt the user
      console.error(error);
    }

    // Select and load new video
    const selectedVideo = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: false,
    });
    if (selectedVideo.type !== "cancel") {
      await videoPlayer.unloadVideo();
      await videoPlayer.loadVideoSource(selectedVideo);
    }

    try {
      // Prepare next ad to be shown
      await AdMobInterstitial.requestAdAsync();
    } catch (error) {
      // Swallow error. A failure to show an ad should not interrupt the user
      console.error(error);
    }
  }, [videoPlayer.isLoaded]);
};

const prepareAds = async () => {
  try {
    await AdMobInterstitial.setAdUnitID(videoSelectAdId);
    await AdMobInterstitial.requestAdAsync();
  } catch (error) {
    // Swallow error. A failure to show an ad should not interrupt the user
    console.error(error);
  }
};

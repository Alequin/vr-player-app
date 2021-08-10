import { AdMobInterstitial } from "expo-ads-admob";
import * as DocumentPicker from "expo-document-picker";
import { useCallback, useEffect, useState } from "react";
import { videoSelectAdId } from "../../../secrets.json";
import { isEnvironmentProduction } from "../../is-environment-production";
import { minutesToMilliseconds } from "../../minutes-to-milliseconds";

export const useSelectVideoAndShowInterstitialAds = (
  videoPlayer,
  areAdsDisabled
) => {
  const [lastTimeAdWasShows, setLastTimeAdWasShown] = useState(0);

  useEffect(() => {
    prepareAds();
  }, []);

  return useCallback(async () => {
    videoPlayer.clearError();
    if (hasEnoughTimePastToShowAnotherAd(lastTimeAdWasShows)) {
      try {
        // Show ads
        const hasAdReadyToShow = await AdMobInterstitial.getIsReadyAsync();
        if (hasAdReadyToShow) {
          await AdMobInterstitial.showAdAsync();
          setLastTimeAdWasShown(Date.now());
        }
      } catch (error) {
        // Swallow error. A failure to show an ad should not interrupt the user
        console.error(error);
      }
    }

    // Select and load new video
    const selectedVideo = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: false,
    });
    if (selectedVideo.type !== "cancel") {
      await videoPlayer.unloadVideo();
      await videoPlayer.loadVideoSource(selectedVideo);

      try {
        // Prepare next ad to be shown
        await AdMobInterstitial.requestAdAsync();
      } catch (error) {
        // Swallow error. A failure to show an ad should not interrupt the user
        console.error(error);
      }
    }
  }, [videoPlayer.isLoaded, areAdsDisabled, lastTimeAdWasShows]);
};

const prepareAds = async () => {
  try {
    await AdMobInterstitial.setAdUnitID(
      isEnvironmentProduction()
        ? videoSelectAdId
        : "ca-app-pub-3940256099942544/1033173712"
    );
    await AdMobInterstitial.requestAdAsync();
  } catch (error) {
    // Swallow error. A failure to show an ad should not interrupt the user
    console.error(error);
  }
};

const TOTAL_TIME_TO_NOT_SHOW_ADS_FOR = minutesToMilliseconds(1);
const hasEnoughTimePastToShowAnotherAd = (time) =>
  Date.now() - time > TOTAL_TIME_TO_NOT_SHOW_ADS_FOR;

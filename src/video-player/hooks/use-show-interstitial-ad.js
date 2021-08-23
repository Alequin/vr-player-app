import { AdMobInterstitial } from "expo-ads-admob";
import { useCallback, useEffect, useState } from "react";
import { videoSelectAdId } from "../../../secrets.json";
import { isEnvironmentProduction } from "../../environment";
import { logError } from "../../logger";
import { hasEnoughTimePastToShowInterstitialAd } from "./has-enough-time-past-to-show-interstitial-ad";
import { useCanShowAds } from "./use-can-show-ads";

export const useShowInterstitialAd = () => {
  const { areAdsDisabled } = useCanShowAds();
  const [isAdVisible, setIsAdVisible] = useState(false);
  const [lastTimeAdWasShows, setLastTimeAdWasShown] = useState(0);

  useEffect(() => {
    if (!areAdsDisabled) {
      AdMobInterstitial.setAdUnitID(
        isEnvironmentProduction()
          ? videoSelectAdId
          : "ca-app-pub-3940256099942544/1033173712"
      )
        .then(async () => AdMobInterstitial.requestAdAsync())
        .catch((error) => {
          // Swallow error. A failure to prepare an ad should not interrupt the user
          logError(error);
        });
    }
  }, [areAdsDisabled]);

  useEffect(() => {
    AdMobInterstitial.addEventListener("interstitialDidClose", () =>
      setIsAdVisible(false)
    );

    AdMobInterstitial.addEventListener(
      "interstitialDidFailToLoad",
      (() => {
        let maxLoadAttemptCount = 5;
        return async () => {
          while (maxLoadAttemptCount > 0)
            try {
              await AdMobInterstitial.requestAdAsync();
            } catch (error) {
              maxLoadAttemptCount--;
            } finally {
              maxLoadAttemptCount = 5;
            }
        };
      })()
    );

    return () => AdMobInterstitial.removeAllListeners();
  }, []);

  return {
    showInterstitialAd: useCallback(async () => {
      // call event if no ad is shown
      if (
        areAdsDisabled ||
        !hasEnoughTimePastToShowInterstitialAd(lastTimeAdWasShows)
      ) {
        return;
      }

      try {
        const hasAdReadyToShow = await AdMobInterstitial.getIsReadyAsync();
        if (hasAdReadyToShow) {
          await AdMobInterstitial.showAdAsync();
          setLastTimeAdWasShown(Date.now());
          setIsAdVisible(true);
        }
      } catch (error) {
        // Swallow error. A failure to show an ad should not interrupt the user
        logError(error);
      }

      try {
        await AdMobInterstitial.requestAdAsync();
      } catch (error) {
        // Swallow error. A failure to request the next ad should not interrupt the user
        logError(error);
      }
    }, [lastTimeAdWasShows, areAdsDisabled]),
    isInterstitialAdVisible: isAdVisible,
  };
};

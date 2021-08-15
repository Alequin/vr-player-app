import { AdMobInterstitial } from "expo-ads-admob";
import { useCallback, useEffect, useState } from "react";
import { isEnvironmentProduction } from "../../is-environment-production";
import { logError } from "../../logger";
import { minutesToMilliseconds } from "../../minutes-to-milliseconds";

export const useShowInterstitialAd = ({ onFinishShowingAd }) => {
  const [lastTimeAdWasShows, setLastTimeAdWasShown] = useState(0);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    AdMobInterstitial.addEventListener("interstitialDidClose", async () => {
      await onFinishShowingAd();
    });

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
  }, [onFinishShowingAd]);

  return useCallback(async () => {
    if (hasEnoughTimePastToShowAnotherAd(lastTimeAdWasShows)) {
      try {
        const hasAdReadyToShow = await AdMobInterstitial.getIsReadyAsync();
        if (hasAdReadyToShow) {
          await AdMobInterstitial.showAdAsync();
          setLastTimeAdWasShown(Date.now());
        } else {
          // call event if no ad is shown
          onFinishShowingAd();
        }
      } catch (error) {
        // Swallow error. A failure to show an ad should not interrupt the user
        logError(error);
        // call event if there is an issue showing the ad
        onFinishShowingAd();
      }

      try {
        await AdMobInterstitial.requestAdAsync();
      } catch (error) {
        // Swallow error. A failure to request the next ad should not interrupt the user
        logError(error);
      }
    }
  }, [lastTimeAdWasShows, onFinishShowingAd]);
};

const TOTAL_TIME_TO_NOT_SHOW_ADS_FOR = minutesToMilliseconds(1);
const hasEnoughTimePastToShowAnotherAd = (time) =>
  Date.now() - time > TOTAL_TIME_TO_NOT_SHOW_ADS_FOR;

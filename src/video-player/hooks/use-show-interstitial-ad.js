import { AdMobInterstitial } from "expo-ads-admob";
import { useCallback, useEffect, useState } from "react";
import { videoSelectAdId } from "../../../secrets.json";
import { isEnvironmentProduction } from "../../environment";
import { logError } from "../../logger";
import { checkIfAdsAreDisabled } from "../ads-disable-time";
import { hasEnoughTimePastToShowInterstitialAd } from "./has-enough-time-past-to-show-interstitial-ad";

export const useShowInterstitialAd = ({ onCloseAd }) => {
  const [lastTimeAdWasShows, setLastTimeAdWasShown] = useState(0);

  useEffect(() => {
    checkIfAdsAreDisabled()
      .then(async (areAdsDisabled) => {
        if (areAdsDisabled) return;

        await AdMobInterstitial.setAdUnitID(
          isEnvironmentProduction()
            ? videoSelectAdId
            : "ca-app-pub-3940256099942544/1033173712"
        );

        await AdMobInterstitial.requestAdAsync();
      })
      .catch((error) => {
        // Swallow error. A failure to prepare an ad should not interrupt the user
        logError(error);
      });
  }, []);

  useEffect(() => {
    AdMobInterstitial.addEventListener("interstitialDidClose", () => {
      onCloseAd();
    });

    return () => AdMobInterstitial.removeAllListeners();
  }, [onCloseAd]);

  return {
    showInterstitialAd: useCallback(async () => {
      // do nothing if no ads cannot be shown
      if (
        (await checkIfAdsAreDisabled()) ||
        !hasEnoughTimePastToShowInterstitialAd(lastTimeAdWasShows)
      ) {
        await onCloseAd();
        return;
      }

      try {
        const hasAdReadyToShow = await AdMobInterstitial.getIsReadyAsync();

        if (hasAdReadyToShow) {
          await AdMobInterstitial.showAdAsync();
          setLastTimeAdWasShown(Date.now());
        } else {
          await onCloseAd();
        }
      } catch (error) {
        // Swallow error. A failure to show an ad should not interrupt the user
        logError(error);
        await onCloseAd();
      }

      try {
        await AdMobInterstitial.requestAdAsync();
      } catch (error) {
        // Swallow error. A failure to request the next ad should not interrupt the user
        logError(error);
      }
    }, [lastTimeAdWasShows, onCloseAd]),
  };
};

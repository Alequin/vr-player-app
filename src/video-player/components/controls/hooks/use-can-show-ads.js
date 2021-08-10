import { useEffect, useState } from "react";
import { checkIfAdsAreDisabled } from "../../../ads-disable-time";

export const useCanShowAds = () => {
  const [areAdsDisabled, setAreAdsDisabled] = useState(false);

  useEffect(() => {
    // Check if ads are disabled on mount
    checkIfAdsAreDisabled().then(setAreAdsDisabled);
  }, []);

  useEffect(() => {
    // If ads are disabled check every 30 seconds if they are now enabled
    if (areAdsDisabled) {
      const interval = setInterval(() => {
        checkIfAdsAreDisabled().then((areDisabled) => {
          if (areDisabled) return;
          setAreAdsDisabled(false);
        });
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [areAdsDisabled]);

  return { areAdsDisabled, setAreAdsDisabled };
};

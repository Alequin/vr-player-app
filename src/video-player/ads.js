import * as asyncStorage from "./async-storage";

const minutesToMilliseconds = (minutes) => minutes * 1000 * 60;

const TOTAL_TIME_TO_DISABLE_ADS_FOR = minutesToMilliseconds(0.5);

export const checkIfAdsDisabled = async () => {
  const disableTime = await asyncStorage.adsDisabledTime.load();
  if (!disableTime) return false;

  const currentTime = Date.now();
  return currentTime - disableTime <= TOTAL_TIME_TO_DISABLE_ADS_FOR;
};

export const disableAds = async () => {
  return asyncStorage.adsDisabledTime.save(Date.now());
};

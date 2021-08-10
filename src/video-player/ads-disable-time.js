import { minutesToMilliseconds } from "../minutes-to-milliseconds";
import * as asyncStorage from "./async-storage";

const TOTAL_TIME_TO_DISABLE_ADS_FOR = minutesToMilliseconds(20);

export const timeAdsAreDisabledFor = async () => {
  const disabledTime = await asyncStorage.adsDisabledTime.load();
  if (!disabledTime) return 0;

  const currentTime = Date.now();
  return TOTAL_TIME_TO_DISABLE_ADS_FOR - (currentTime - disabledTime);
};

export const checkIfAdsAreDisabled = async () => {
  const disableTime = await timeAdsAreDisabledFor();
  return disableTime >= 0;
};

export const disableAds = async () => {
  const remainingDisabledTime = await timeAdsAreDisabledFor();
  return asyncStorage.adsDisabledTime.save(
    remainingDisabledTime > 0 ? Date.now() + remainingDisabledTime : Date.now()
  );
};

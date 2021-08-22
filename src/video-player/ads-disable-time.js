import { minutesToMilliseconds } from "../minutes-to-milliseconds";
import * as asyncStorage from "./async-storage";

export const timeAdsAreDisabledFor = async () => {
  const disabledDetails = await asyncStorage.adsDisabledTime.load();
  if (!disabledDetails) return 0;
  const { disableTime, totalDisableTime } = disabledDetails;
  const timeAdHaveBeenDisabledFor = Date.now() - disableTime;

  return Math.max(totalDisableTime - timeAdHaveBeenDisabledFor, 0);
};

export const checkIfAdsAreDisabled = async () =>
  (await timeAdsAreDisabledFor()) > 0;

export const disableAds = async ({
  minutesToDisableFor,
  wasDisabledDueToError,
}) => {
  const remainingDisabledTime = await timeAdsAreDisabledFor();
  // Do not disable ads more than once when they are being disabled due to an error
  if (wasDisabledDueToError && remainingDisabledTime > 0) return;

  return asyncStorage.adsDisabledTime.save({
    disableTime: Date.now(),
    totalDisableTime:
      remainingDisabledTime + minutesToMilliseconds(minutesToDisableFor),
  });
};

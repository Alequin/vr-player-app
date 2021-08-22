import { minutesToMilliseconds } from "../../src/minutes-to-milliseconds";
import * as asyncStorage from "../../src/video-player/async-storage";

export const mockAdsAreDisabled = () => {
  const disableAdsTime = new Date();
  disableAdsTime.setMinutes(disableAdsTime.getMinutes() - 10);
  jest.spyOn(asyncStorage.adsDisabledTime, "load").mockResolvedValue({
    disableTime: disableAdsTime.getTime(),
    totalDisableTime: minutesToMilliseconds(20),
  });
};

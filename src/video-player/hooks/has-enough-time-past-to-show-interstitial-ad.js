import { minutesToMilliseconds } from "../../minutes-to-milliseconds";

const TOTAL_TIME_TO_NOT_SHOW_ADS_FOR = minutesToMilliseconds(1);
export const hasEnoughTimePastToShowInterstitialAd = (time) =>
  Date.now() - time > TOTAL_TIME_TO_NOT_SHOW_ADS_FOR;

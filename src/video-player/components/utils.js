import { minutesToMilliseconds } from "../../minutes-to-milliseconds";
import { PLAYER_MODES, RESIZE_MODES } from "../hooks/use-paired-video-players";

const ONE_HOUR_IN_MILLISECONDS = minutesToMilliseconds(60);

export const millisecondsToTime = (milliseconds, videoDuration) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);

  const minutesExcludingHours = totalMinutes - totalHours * 60;
  const secondsExcludingMinutes = totalSeconds - totalMinutes * 60;

  return [
    hoursAsTimeUnit(totalHours, videoDuration),
    asTimeUnit(minutesExcludingHours),
    asTimeUnit(secondsExcludingMinutes),
  ]
    .filter(Boolean) // Remove totalHours if it's not usable
    .join(":");
};

const hoursAsTimeUnit = (totalHours, videoDuration) => {
  const isVideoLongerThanAnHour = videoDuration >= ONE_HOUR_IN_MILLISECONDS;
  return isVideoLongerThanAnHour ? asTimeUnit(totalHours) : null;
};

const asTimeUnit = (number) => {
  const numberAsString = number.toString();

  if (numberAsString.length === 1) return `0${numberAsString}`;
  return numberAsString;
};

export const togglePlayerModeButtonIconName = (videoPlayerMode) => {
  if (videoPlayerMode === PLAYER_MODES.VR_VIDEO) return "screenDesktop";
  if (videoPlayerMode === PLAYER_MODES.NORMAL_VIDEO) return "vrHeadset";
};

export const toggleResizeModeButtonIconName = (videoResizeMode) => {
  if (videoResizeMode === RESIZE_MODES.RESIZE_MODE_COVER) return "screenNormal";
  if (videoResizeMode === RESIZE_MODES.RESIZE_MODE_CONTAIN) return "fitScreen";
  if (videoResizeMode === RESIZE_MODES.RESIZE_MODE_STRETCH)
    return "stretchToPage";
};

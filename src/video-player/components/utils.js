import { PLAYER_MODES, RESIZE_MODES } from "../hooks/use-paired-video-players";

const millisecondsToTimeUnits = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);

  return [
    asTimeUnit(totalHours),
    asTimeUnit(totalMinutes - totalHours * 60),
    asTimeUnit(totalSeconds - totalMinutes * 60),
  ];
};

export const millisecondsToTime = (milliseconds) => {
  return millisecondsToTimeUnits(milliseconds).join(":");
};

export const millisecondsToTimeWithoutHours = (milliseconds) => {
  return millisecondsToTimeUnits(milliseconds).slice(1).join(":");
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

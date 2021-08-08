import * as DocumentPicker from "expo-document-picker";
import { MODES, RESIZE_MODES } from "../hooks/use-paired-video-players";

export const millisecondsToTime = (milliseconds) => {
  const totalSeconds = Math.round(milliseconds / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);

  const minutesExcludingHours = totalMinutes - totalHours * 60;
  const secondsExcludingMinutes = totalSeconds - totalMinutes * 60;

  return [
    totalHours,
    asTimeUnit(minutesExcludingHours),
    asTimeUnit(secondsExcludingMinutes),
  ].join(":");
};

const asTimeUnit = (number) => {
  const numberAsString = number.toString();

  if (numberAsString.length === 1) return `0${numberAsString}`;
  return numberAsString;
};

export const togglePlayerModeButtonIconName = (videoPlayerMode) => {
  if (videoPlayerMode === MODES.VR_VIDEO) return "screenDesktop";
  if (videoPlayerMode === MODES.NORMAL_VIDEO) return "vrHeadset";
};

export const toggleResizeModeButtonIconName = (videoResizeMode) => {
  if (videoResizeMode === RESIZE_MODES.RESIZE_MODE_COVER) return "screenNormal";
  if (videoResizeMode === RESIZE_MODES.RESIZE_MODE_CONTAIN) return "fitScreen";
  if (videoResizeMode === RESIZE_MODES.RESIZE_MODE_STRETCH)
    return "stretchToPage";
};

export const selectAFile = async () =>
  DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: false,
  });

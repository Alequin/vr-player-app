export const findLeftVideoPlayer = (screen) =>
  screen.getByTestId("leftVideoPlayer").parent.parent.parent.parent.parent;

export const findRightVideoPlayer = (screen) =>
  screen.getByTestId("rightVideoPlayer").parent.parent.parent.parent.parent;

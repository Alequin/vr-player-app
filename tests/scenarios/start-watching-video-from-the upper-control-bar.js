import { act, within } from "@testing-library/react-native";
import { asyncPressEvent, getButtonByChildTestId } from "../test-utils";

export const startWatchingVideoFromUpperControlBar = async ({
  screen,
  videoPlayerMocks,
  getInterstitialDidCloseCallback,
}) => {
  videoPlayerMocks.load.mockClear();
  videoPlayerMocks.play.mockClear();
  videoPlayerMocks.getStatus.mockClear();
  videoPlayerMocks.setPosition.mockClear();

  // Press button to pick a video
  await asyncPressEvent(
    getButtonByChildTestId(
      within(screen.getByTestId("upperControlBar")),
      "folderVideoIcon"
    )
  );

  // Fire callback to start playing the video
  const fireDidCloseCallback = getInterstitialDidCloseCallback();
  await act(fireDidCloseCallback);

  // confirm video is loaded and starts playing
  expect(videoPlayerMocks.load).toHaveBeenCalledTimes(1);
  // getStatus is called to set the videos duration in state
  expect(videoPlayerMocks.getStatus).toHaveBeenCalledTimes(1);
  // Confirm position is set to 0 manually to reduce chances of sync issues
  expect(videoPlayerMocks.setPosition).toHaveBeenCalledTimes(1);
  expect(videoPlayerMocks.setPosition).toHaveBeenCalledWith(0);
  expect(videoPlayerMocks.play).toHaveBeenCalledTimes(1);
};

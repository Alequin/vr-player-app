import { act, within } from "@testing-library/react-native";
import { asyncPressEvent, getButtonByText } from "../common-test-utils";

export const startWatchingVideoFromHomeView = async ({
  screen,
  videoPlayerMocks,
  getInterstitialDidCloseCallback,
}) => {
  videoPlayerMocks.load.mockClear();
  videoPlayerMocks.play.mockClear();
  videoPlayerMocks.setPosition.mockClear();

  const loadViewButton = getButtonByText(
    within(screen.getByTestId("homeView")),
    "Select a video to watch"
  );
  expect(loadViewButton).toBeDefined();

  // Press button to load video
  await asyncPressEvent(loadViewButton);

  // Fire callback to start playing the video
  const fireDidCloseCallback = getInterstitialDidCloseCallback();
  await act(fireDidCloseCallback);

  // confirm video is loaded and starts playing
  expect(videoPlayerMocks.load).toHaveBeenCalledTimes(1);
  // Confirm position is set to 0 manually to reduce chances of sync issues
  expect(videoPlayerMocks.setPosition).toHaveBeenCalledTimes(1);
  expect(videoPlayerMocks.setPosition).toHaveBeenCalledWith(0);
  expect(videoPlayerMocks.play).toHaveBeenCalledTimes(1);
};

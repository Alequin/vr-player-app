import { act, within } from "@testing-library/react-native";
import { asyncPressEvent, getButtonByText } from "../test-utils";

export const startWatchingVideoFromHomeView = async ({
  screen,
  videoPlayerMocks,
  getInterstitialDidCloseCallback,
  mockVideoFilepath,
}) => {
  videoPlayerMocks.load.mockClear();
  videoPlayerMocks.play.mockClear();
  videoPlayerMocks.getStatus.mockClear();
  videoPlayerMocks.setPosition.mockClear();

  const loadViewButton = getButtonByText(
    within(screen.getByTestId("homeView")),
    "Select a video to watch"
  );
  expect(loadViewButton).toBeTruthy();

  // Press button to load video
  await asyncPressEvent(loadViewButton);

  // Confirm we are taken to the "select a video" page
  expect(screen.getByTestId("selectVideoListView")).toBeTruthy();

  // Select the first video option
  const selectVideoButton = getButtonByText(
    within(screen.getByTestId("selectVideoListView")),
    mockVideoFilepath
  );
  expect(selectVideoButton).toBeTruthy();
  await asyncPressEvent(selectVideoButton);

  if (getInterstitialDidCloseCallback) {
    // Fire callback to start playing the video
    const fireDidCloseCallback = getInterstitialDidCloseCallback();
    act(fireDidCloseCallback);
  }

  // confirm video is loaded and starts playing
  expect(videoPlayerMocks.load).toHaveBeenCalledTimes(1);
  expect(videoPlayerMocks.load).toHaveBeenCalledWith(
    {
      filename: mockVideoFilepath,
      uri: mockVideoFilepath,
      duration: 10000,
      modificationTime: 1609459200000,
    },
    {
      primaryOptions: {
        isLooping: true,
      },
      secondaryOptions: {
        isMuted: true,
        isLooping: true,
      },
    }
  );
  // getStatus is called to set the videos duration in state
  expect(videoPlayerMocks.getStatus).toHaveBeenCalledTimes(1);

  expect(videoPlayerMocks.play).toHaveBeenCalledTimes(1);
};

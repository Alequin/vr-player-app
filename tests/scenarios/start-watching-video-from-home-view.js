import { act, within } from "@testing-library/react-native";
import { mockMediaLibrary } from "../mocks/mock-media-library";
import { asyncPressEvent, getButtonByText } from "../test-utils";

export const startWatchingVideoFromHomeView = async ({
  screen,
  videoPlayerMocks,
  getInterstitialDidCloseCallback,
  mockVideoFilepath = "path/to/file",
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
  expect(screen.getByTestId("selectVideoView")).toBeTruthy();

  // Select the first video option
  await asyncPressEvent(
    getButtonByText(
      within(screen.getByTestId("selectVideoView")),
      mockVideoFilepath
    )
  );

  // Fire callback to start playing the video
  const fireDidCloseCallback = getInterstitialDidCloseCallback();
  act(fireDidCloseCallback);

  // confirm video is loaded and starts playing
  expect(videoPlayerMocks.load).toHaveBeenCalledTimes(1);
  expect(videoPlayerMocks.load).toHaveBeenCalledWith(
    { filename: mockVideoFilepath, uri: mockVideoFilepath },
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

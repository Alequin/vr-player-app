import { act, within } from "@testing-library/react-native";
import {
  asyncPressEvent,
  getButtonByChildTestId,
  getButtonByText,
} from "../test-utils";

export const startWatchingVideoFromUpperControlBar = async ({
  screen,
  videoPlayerMocks,
  getInterstitialDidCloseCallback,
  mockVideoFilepath = "path/to/file",
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

  // Confirm we are taken to the "select a video" page
  expect(screen.getByTestId("selectVideoListView")).toBeTruthy();

  // Select the first video option
  await asyncPressEvent(
    getButtonByText(
      within(screen.getByTestId("selectVideoListView")),
      mockVideoFilepath
    )
  );

  if (getInterstitialDidCloseCallback) {
    // Fire callback to start playing the video
    const fireDidCloseCallback = getInterstitialDidCloseCallback();
    act(fireDidCloseCallback);
  }

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
  expect(videoPlayerMocks.getStatus).toHaveBeenCalled();

  expect(videoPlayerMocks.play).toHaveBeenCalledTimes(1);
};

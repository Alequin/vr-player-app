import { act, within } from "@testing-library/react-native";
import { mockDocumentPicker } from "../mocks/mock-document-picker";
import { asyncPressEvent, getButtonByChildTestId } from "../test-utils";

export const startWatchingVideoFromUpperControlBar = async ({
  screen,
  videoPlayerMocks,
  getInterstitialDidCloseCallback,
  mockVideoFilepath,
}) => {
  videoPlayerMocks.load.mockClear();
  videoPlayerMocks.play.mockClear();
  videoPlayerMocks.getStatus.mockClear();
  videoPlayerMocks.setPosition.mockClear();
  mockDocumentPicker.returnWithASelectedFile(mockVideoFilepath);

  // Press button to pick a video
  await asyncPressEvent(
    getButtonByChildTestId(
      within(screen.getByTestId("upperControlBar")),
      "folderVideoIcon"
    )
  );

  if (getInterstitialDidCloseCallback) {
    // Fire callback to start playing the video
    const fireDidCloseCallback = getInterstitialDidCloseCallback();
    act(fireDidCloseCallback);
  }

  // confirm video is loaded and starts playing
  expect(videoPlayerMocks.load).toHaveBeenCalledTimes(1);
  // getStatus is called to set the videos duration in state
  expect(videoPlayerMocks.getStatus).toHaveBeenCalledTimes(1);

  expect(videoPlayerMocks.play).toHaveBeenCalledTimes(1);
};

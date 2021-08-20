import { act, within } from "@testing-library/react-native";
import { mockDocumentPicker } from "../mocks/mock-document-picker";
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
  mockDocumentPicker.returnWithASelectedFile(mockVideoFilepath);

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
  // getStatus is called to set the videos duration in state
  expect(videoPlayerMocks.getStatus).toHaveBeenCalledTimes(1);

  expect(videoPlayerMocks.play).toHaveBeenCalledTimes(1);
};

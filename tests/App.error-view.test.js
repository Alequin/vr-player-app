jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");

import { act, within } from "@testing-library/react-native";
import React from "React";
import { App } from "../App";
import {
  asyncPressEvent,
  asyncRender,
  getButtonByText,
} from "./common-test-utils";
import { mockAdMobInterstitial } from "./mocks/mock-ad-mob";
import { mockDocumentPicker } from "./mocks/mock-document-picker";
import { mockLogError } from "./mocks/mock-logger";
import { mockUseVideoPlayerRefs } from "./mocks/mock-use-video-player-refs";
import { goToErrorViewAfterFailToLoadFromHomePage } from "./scenarios/go-to-error-view-after-fail-to-load-from-home-page";

describe("App - Error view", () => {
  let logErrorMock = mockLogError();

  beforeEach(() => {
    jest.clearAllMocks();
    // Silence custom logs for error related tests
    logErrorMock.mockImplementation(() => {});
  });

  afterAll(() => {
    logErrorMock.mockReset();
  });

  it("Shows the expected message on the error view", async () => {
    const { mocks } = mockUseVideoPlayerRefs();

    const screen = await asyncRender(<App />);

    await goToErrorViewAfterFailToLoadFromHomePage({
      screen,
      videoPlayerMocks: mocks,
      mockVideoFilepath: "./fake/file/path.jpeg",
    });
    const errorView = screen.getByTestId("errorView");

    expect(
      within(errorView).getByText("Sorry, there was an issue playing the video")
    );
    expect(
      within(errorView).getByText(
        `Unable to play ./fake/file/path.jpeg as a video`
      )
    );
  });

  it("Shows a button to open a new video on the error view", async () => {
    const { mocks } = mockUseVideoPlayerRefs();

    const screen = await asyncRender(<App />);

    await goToErrorViewAfterFailToLoadFromHomePage({
      screen,
      videoPlayerMocks: mocks,
      mockVideoFilepath: "./fake/file/path.jpeg",
    });
    const errorView = screen.getByTestId("errorView");

    const loadViewButton = getButtonByText(
      within(errorView),
      "Open a different video"
    );

    expect(loadViewButton).toBeDefined();
    expect(within(loadViewButton).getByTestId("folderVideoIcon")).toBeDefined();
  });

  it("Returns to the error page when attempting to open a video but there is an issue loading a new video", async () => {
    const { mocks } = mockUseVideoPlayerRefs();

    mocks.load.mockRejectedValue("fail to load");

    const screen = await asyncRender(<App />);

    // Go to error page
    await goToErrorViewAfterFailToLoadFromHomePage({
      screen,
      videoPlayerMocks: mocks,
      mockVideoFilepath: "./fake/file/path.jpeg",
    });

    // Load a new video from the error page
    const loadViewButton = getButtonByText(
      within(screen.getByTestId("errorView")),
      "Open a different video"
    );
    await asyncPressEvent(loadViewButton);

    // Stay on the error page due to another error
    expect(screen.getByTestId("errorView")).toBeDefined();
  });

  it("Can start playing a new video from the error page", async () => {
    const { mocks } = mockUseVideoPlayerRefs();
    const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

    const screen = await asyncRender(<App />);

    // Go to error page
    await goToErrorViewAfterFailToLoadFromHomePage({
      screen,
      videoPlayerMocks: mocks,
      mockVideoFilepath: "./fake/file/path.jpeg",
    });

    // Reset mocks before attempting to open a new video
    mocks.load.mockResolvedValue(undefined);
    jest.clearAllMocks();

    // Load a new video from the error page
    mockDocumentPicker.returnWithASelectedFile();
    const loadViewButton = getButtonByText(
      within(screen.getByTestId("errorView")),
      "Open a different video"
    );
    await asyncPressEvent(loadViewButton);

    // Fire callback to start playing the video
    const fireDidCloseCallback = getInterstitialDidCloseCallback();
    await act(fireDidCloseCallback);

    // confirm video is loaded and starts playing
    expect(mocks.load).toHaveBeenCalledTimes(1);
    // Confirm position is set to 0 manually to reduce chances of sync issues
    expect(mocks.setPosition).toHaveBeenCalledTimes(1);
    expect(mocks.setPosition).toHaveBeenCalledWith(0);
    expect(mocks.play).toHaveBeenCalledTimes(1);
  });

  it("Shows an ad when opening a video after an error even if there is no delay between the two attempts to open the video", async () => {
    const { mocks } = mockUseVideoPlayerRefs();
    const { getInterstitialDidCloseCallback, showAdAsync } =
      mockAdMobInterstitial();

    const screen = await asyncRender(<App />);

    // Go to error page
    await goToErrorViewAfterFailToLoadFromHomePage({
      screen,
      videoPlayerMocks: mocks,
      mockVideoFilepath: "./fake/file/path.jpeg",
    });

    // Reset mocks before attempting to open a new video
    mocks.load.mockResolvedValue(undefined);
    jest.clearAllMocks();

    // Load a new video from the error page
    mockDocumentPicker.returnWithASelectedFile();
    const loadViewButton = getButtonByText(
      within(screen.getByTestId("errorView")),
      "Open a different video"
    );
    await asyncPressEvent(loadViewButton);

    // Fire callback to start playing the video
    const fireDidCloseCallback = getInterstitialDidCloseCallback();
    await act(fireDidCloseCallback);

    // confirm video is loaded and starts playing
    expect(mocks.load).toHaveBeenCalledTimes(1);
    expect(mocks.play).toHaveBeenCalledTimes(1);

    // confirm ads are shown
    expect(showAdAsync).toHaveBeenCalledTimes(1);
  });
});

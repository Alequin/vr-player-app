jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");

import { act, cleanup, within } from "@testing-library/react-native";
import { AdMobInterstitial } from "expo-ads-admob";
import * as DocumentPicker from "expo-document-picker";
import React from "React";
import waitForExpect from "wait-for-expect";
import { App } from "../App";
import {
  asyncPressEvent,
  asyncRender,
  getButtonByChildTestId,
} from "./common-test-utils";
import { mockAdMobInterstitial } from "./mocks/mock-ad-mob";
import { mockDocumentPicker } from "./mocks/mock-document-picker";
import { mockLogError } from "./mocks/mock-logger";
import { mockUseVideoPlayerRefs } from "./mocks/mock-use-video-player-refs";
import { goToErrorViewAfterFailToLoadFromHomePage } from "./scenarios/go-to-error-view-after-fail-to-load-from-home-page";

describe("App - Upper control bar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(cleanup);

  it("Disables the back button while on the home page", async () => {
    const screen = await asyncRender(<App />);

    // Confirm the view we are on
    expect(screen.getByTestId("homeView")).toBeDefined();

    const upperControlBar = screen.getByTestId("upperControlBar");
    expect(upperControlBar).toBeDefined();

    const backButton = getButtonByChildTestId(
      within(upperControlBar),
      "iosArrowBackIcon"
    );

    expect(backButton.props.testID).toBe("disabledButton");
  });

  it("Can open and play a video if the 'load a video' button is press", async () => {
    const { mocks } = mockUseVideoPlayerRefs();
    mockDocumentPicker.returnWithASelectedFile();
    const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

    const screen = await asyncRender(<App />);

    // Press button to pick a video
    await asyncPressEvent(
      getButtonByChildTestId(
        within(screen.getByTestId("upperControlBar")),
        "folderVideoIcon"
      )
    );

    // Confirm document picker is opened
    await waitForExpect(() =>
      expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled()
    );

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

  it("shows an interstitial ad when opening a video", async () => {
    mockUseVideoPlayerRefs();
    mockDocumentPicker.returnWithASelectedFile();
    mockAdMobInterstitial();

    jest.spyOn(AdMobInterstitial, "getIsReadyAsync").mockResolvedValue(true);

    const screen = await asyncRender(<App />);

    // Press button to pick a video
    await asyncPressEvent(
      getButtonByChildTestId(
        within(screen.getByTestId("upperControlBar")),
        "folderVideoIcon"
      )
    );

    // Shows an ad
    expect(AdMobInterstitial.showAdAsync).toHaveBeenCalledTimes(1);
  });

  it("Does not open a second interstitial ad if another one was opened recently", async () => {
    mockUseVideoPlayerRefs();
    mockDocumentPicker.returnWithASelectedFile();
    mockAdMobInterstitial();

    jest.spyOn(AdMobInterstitial, "getIsReadyAsync").mockResolvedValue(true);

    const screen = await asyncRender(<App />);

    // Press button to pick a video
    await asyncPressEvent(
      getButtonByChildTestId(
        within(screen.getByTestId("upperControlBar")),
        "folderVideoIcon"
      )
    );

    // Shows an ad
    expect(AdMobInterstitial.showAdAsync).toHaveBeenCalledTimes(1);

    // Press button to pick another video
    await asyncPressEvent(
      getButtonByChildTestId(
        within(screen.getByTestId("upperControlBar")),
        "folderVideoIcon"
      )
    );

    // Does not show another ad
    expect(AdMobInterstitial.showAdAsync).toHaveBeenCalledTimes(1);
  });

  it("Is able to unload a video and return to the home view when the back button is pressed", async () => {
    const { mocks } = mockUseVideoPlayerRefs();
    mockDocumentPicker.returnWithASelectedFile();
    const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

    const screen = await asyncRender(<App />);

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
    expect(mocks.load).toHaveBeenCalledTimes(1);

    // confirm the home view is not visible
    expect(screen.queryByTestId("homeView")).toBe(null);

    // Return to home view with the back button
    await asyncPressEvent(
      getButtonByChildTestId(
        within(screen.getByTestId("upperControlBar")),
        "iosArrowBackIcon"
      )
    );

    // confirm video is unloaded
    expect(mocks.unload).toHaveBeenCalledTimes(1);

    // confirm the home view is now visible
    expect(screen.getByTestId("homeView")).toBeDefined();
  });

  describe("Upper control bar - when an error occurs", () => {
    let logErrorMock = mockLogError();

    beforeEach(() => {
      // Silence custom logs for error related tests
      logErrorMock.mockImplementation(() => {});
    });

    afterAll(() => {
      logErrorMock.mockReset();
    });

    it("Shows the error page when attempting to open a video but there is an issue unloading the previous video", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockDocumentPicker.returnWithASelectedFile();

      mocks.unload.mockRejectedValue(null);

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeDefined();

      // Pick a new video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      );

      // Pick another video as unload is only called if we have a video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      );

      // Check the error page is shown due to the error
      const errorView = screen.getByTestId("errorView");
      expect(errorView).toBeDefined();
    });

    it("Shows the error page when attempting to open a video from the upper control bar but there is an issue loading the new video", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockDocumentPicker.returnWithASelectedFile();

      mocks.load.mockRejectedValue(null);

      const screen = await asyncRender(<App />);

      // Pick a new video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      );

      // Check the error page is shown due to the error
      const errorView = screen.getByTestId("errorView");
      expect(errorView).toBeDefined();
    });

    it("Clears an error and returns to the home view when the back button is pressed after an error occurs", async () => {
      const { mocks } = mockUseVideoPlayerRefs();

      const screen = await asyncRender(<App />);

      await goToErrorViewAfterFailToLoadFromHomePage({
        screen,
        videoPlayerMocks: mocks,
      });

      // confirm the home view is not visible
      expect(screen.queryByTestId("homeView")).toBe(null);

      // Return to home view with the back button
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      );

      // confirm the home view is now visible
      expect(screen.getByTestId("homeView")).toBeDefined();
    });
  });
});

jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");

import { cleanup, within } from "@testing-library/react-native";
import { AdMobInterstitial } from "expo-ads-admob";
import * as DocumentPicker from "expo-document-picker";
import React from "React";
import waitForExpect from "wait-for-expect";
import { App } from "../App";
import { logError } from "../src/logger";
import {
  asyncPressEvent,
  asyncRender,
  getButtonByChildTestId,
  getButtonByText,
} from "./common-test-utils";
import { mockAdMobInterstitial } from "./mocks/mock-ad-mob";
import { mockDocumentPicker } from "./mocks/mock-document-picker";
import { mockLogError } from "./mocks/mock-logger";
import { mockUseVideoPlayerRefs } from "./mocks/mock-use-video-player-refs";
import { goToErrorViewAfterFailToLoadFromHomePage } from "./scenarios/go-to-error-view-after-fail-to-load-from-home-page";
import { startWatchingVideoFromHomeView } from "./scenarios/start-watching-video-from-home-view";

describe("App - Home view", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("Shows a button to load a video", async () => {
    const screen = await asyncRender(<App />);
    const homeView = screen.getByTestId("homeView");
    expect(homeView).toBeDefined();

    const loadViewButton = getButtonByText(
      within(homeView),
      "Select a video to watch"
    );

    expect(loadViewButton).toBeDefined();
    expect(within(loadViewButton).getByTestId("folderVideoIcon")).toBeDefined();
  });

  it("Shows a button to view the disable ads view", async () => {
    const screen = await asyncRender(<App />);
    const homeView = screen.getByTestId("homeView");
    expect(homeView).toBeDefined();

    const disableAdsButton = getButtonByText(within(homeView), "Disable ads");

    expect(disableAdsButton).toBeDefined();
    expect(within(disableAdsButton).getByTestId("cancelIcon")).toBeDefined();
  });

  it("Opens the disable ads view when the 'disable ads' button is pressed", async () => {
    const screen = await asyncRender(<App />);
    const homeView = screen.getByTestId("homeView");
    expect(homeView).toBeDefined();

    const disableAdsButton = getButtonByText(within(homeView), "Disable ads");
    expect(disableAdsButton).toBeDefined();

    // Press button to move to disable ads view
    await asyncPressEvent(disableAdsButton);

    // Confirm disable ad view is shown
    expect(screen.getByTestId("disableAdsView")).toBeDefined();
  });

  it("Opens the document viewer when the 'load a video' button is press", async () => {
    mockUseVideoPlayerRefs();

    jest
      .spyOn(DocumentPicker, "getDocumentAsync")
      .mockResolvedValue({ type: "cancel" });

    const screen = await asyncRender(<App />);
    const homeView = screen.getByTestId("homeView");
    expect(homeView).toBeDefined();

    const loadViewButton = getButtonByText(
      within(homeView),
      "Select a video to watch"
    );
    expect(loadViewButton).toBeDefined();

    // Press button to pick a video
    await asyncPressEvent(loadViewButton);

    // Confirm document picker is opened
    await waitForExpect(() =>
      expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled()
    );
  });

  it("Opens an interstitial ad when the 'load a video' button is press", async () => {
    mockUseVideoPlayerRefs();
    mockDocumentPicker.returnWithASelectedFile();
    mockAdMobInterstitial();

    jest.spyOn(AdMobInterstitial, "getIsReadyAsync").mockResolvedValue(true);

    const screen = await asyncRender(<App />);
    const homeView = screen.getByTestId("homeView");
    expect(homeView).toBeDefined();

    const loadViewButton = getButtonByText(
      within(homeView),
      "Select a video to watch"
    );
    expect(loadViewButton).toBeDefined();

    // Sets a unit ad id
    expect(AdMobInterstitial.setAdUnitID).toHaveBeenCalledTimes(1);

    // Requests an ad to show
    expect(AdMobInterstitial.requestAdAsync).toHaveBeenCalledTimes(1);

    // Press button to pick a video
    await asyncPressEvent(loadViewButton);

    // Checks if an ad is ready to show
    expect(AdMobInterstitial.getIsReadyAsync).toHaveBeenCalledTimes(1);

    // Shows an ad
    expect(AdMobInterstitial.showAdAsync).toHaveBeenCalledTimes(1);
  });

  it("Loads a new interstitial ad after showing one if a video is selected", async () => {
    mockUseVideoPlayerRefs();
    mockDocumentPicker.returnWithASelectedFile();
    mockAdMobInterstitial();

    jest.spyOn(AdMobInterstitial, "getIsReadyAsync").mockResolvedValue(true);

    const screen = await asyncRender(<App />);
    const homeView = screen.getByTestId("homeView");
    expect(homeView).toBeDefined();

    const loadViewButton = getButtonByText(
      within(homeView),
      "Select a video to watch"
    );
    expect(loadViewButton).toBeDefined();

    // Press button to pick a video
    await asyncPressEvent(loadViewButton);

    // Shows an ad
    expect(AdMobInterstitial.showAdAsync).toHaveBeenCalledTimes(1);

    // loads ads twice, the initial load and after the ads are shown
    expect(AdMobInterstitial.requestAdAsync).toHaveBeenCalledTimes(2);
  });

  it("plays video from the home view when one is selected", async () => {
    const { mocks } = mockUseVideoPlayerRefs();
    mockDocumentPicker.returnWithASelectedFile();
    const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

    const screen = await asyncRender(<App />);
    const homeView = screen.getByTestId("homeView");
    expect(homeView).toBeDefined();

    // Play the video and confirm the correct functions are called
    await startWatchingVideoFromHomeView({
      screen,
      videoPlayerMocks: mocks,
      getInterstitialDidCloseCallback,
    });
  });

  describe("still allows the video to load and play when there is an error with interstitial ads", () => {
    let logErrorMock = mockLogError();

    beforeEach(() => {
      // Silence custom logs for error related tests
      logErrorMock.mockClear();
      logErrorMock.mockImplementation(() => {});
    });

    afterAll(() => {
      logErrorMock.mockReset();
    });

    it("catches the error and still allows the video to play when there is an issue setting the interstitial unit id", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockDocumentPicker.returnWithASelectedFile();
      const { setAdUnitID, getInterstitialDidCloseCallback } =
        mockAdMobInterstitial();

      setAdUnitID.mockRejectedValue("fake setAdUnitID error");

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeDefined();

      // an error occurs
      expect(logError).toHaveBeenCalledWith("fake setAdUnitID error");

      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });
    });

    it("catches the error and still allows the video to play when there is an issue requesting an ad", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockDocumentPicker.returnWithASelectedFile();
      const { requestAdAsync, getInterstitialDidCloseCallback } =
        mockAdMobInterstitial();

      requestAdAsync.mockRejectedValue("fake requestAdAsync error");

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeDefined();

      // an error occurs
      expect(logError).toHaveBeenCalledWith("fake requestAdAsync error");

      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });
    });

    it("catches the error and still allows the video to play when there is an issue confirming the ad is ready to show", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockDocumentPicker.returnWithASelectedFile();
      const { getIsReadyAsync, getInterstitialDidCloseCallback } =
        mockAdMobInterstitial();

      getIsReadyAsync.mockRejectedValue("fake getIsReadyAsync error");

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeDefined();

      // No error initially
      expect(logError).not.toHaveBeenCalled();

      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      // an error occurs
      expect(logError).toHaveBeenCalledWith("fake getIsReadyAsync error");
    });

    it("catches the error and still allows the video to play when there is an issue showing the ad", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockDocumentPicker.returnWithASelectedFile();
      const { showAdAsync, getInterstitialDidCloseCallback } =
        mockAdMobInterstitial();

      showAdAsync.mockRejectedValue("fake showAdAsync error");

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeDefined();

      // No error initially
      expect(logError).not.toHaveBeenCalled();

      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      // an error occurs
      expect(logError).toHaveBeenCalledWith("fake showAdAsync error");
    });

    it("catches the error and still allows the video to play when there is an issue requesting an ad for the second time", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockDocumentPicker.returnWithASelectedFile();
      const { requestAdAsync, getInterstitialDidCloseCallback } =
        mockAdMobInterstitial();

      requestAdAsync.mockResolvedValueOnce();
      requestAdAsync.mockRejectedValueOnce("fake requestAdAsync error");
      requestAdAsync.mockResolvedValue();

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeDefined();

      // No error initially
      expect(logError).not.toHaveBeenCalled();

      // View video to view ad an load next ad
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      // an error occurs
      expect(logError).toHaveBeenCalledWith("fake requestAdAsync error");

      // Return to home view
      const backButton = getButtonByChildTestId(
        within(screen.getByTestId("upperControlBar")),
        "iosArrowBackIcon"
      );
      expect(backButton).toBeDefined();
      await asyncPressEvent(backButton);

      // View video again without issues

      logError.mockClear();
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      expect(logError).toHaveBeenCalledTimes(0);
    });
  });

  describe("Shows the error page", () => {
    let logErrorMock = mockLogError();

    beforeEach(() => {
      // Silence custom logs for error related tests
      logErrorMock.mockImplementation(() => {});
    });

    afterAll(() => {
      logErrorMock.mockReset();
    });

    it("Shows the error page when attempting to open a video from the home view but there is an issue loading the new video", async () => {
      const { mocks } = mockUseVideoPlayerRefs();

      const screen = await asyncRender(<App />);

      await goToErrorViewAfterFailToLoadFromHomePage({
        screen,
        videoPlayerMocks: mocks,
      });
    });
  });
});

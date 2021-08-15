jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");
jest.genMockFromModule("expo-ads-admob");

jest.genMockFromModule("expo-av");

import { cleanup, within, act } from "@testing-library/react-native";
import { AdMobInterstitial } from "expo-ads-admob";
import * as DocumentPicker from "expo-document-picker";
import React from "React";
import waitForExpect from "wait-for-expect";
import { App } from "../App";
import {
  asyncPressEvent,
  asyncRender,
  getButtonByChildTestId,
  getButtonByText,
} from "./common-test-utils";
import { mockUseVideoPlayerRefs } from "./mocks/mock-use-video-player-refs";
import { mockDocumentPicker } from "./mocks/mock-document-picker";
import { mockAdMobInterstitial } from "./mocks/mock-ad-mob";
import { mockLogError } from "./mocks/mock-logger";
import { logError } from "../src/logger";

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
    mockDocumentPicker.returnWithoutSelectingAFile();
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

    // Sets a unit ad id
    expect(AdMobInterstitial.setAdUnitID).toHaveBeenCalledTimes(1);

    // Requests an ad to show
    expect(AdMobInterstitial.requestAdAsync).toHaveBeenCalledTimes(1);

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

  describe("still allows the video to load and play when there is an error with interstitial ads", () => {
    beforeEach(() => mockLogError().mockImplementation(() => {}));

    it("catches the error and still allows the video to play when there is an issue setting the interstitial unit id", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockDocumentPicker.returnWithASelectedFile();
      const { setAdUnitID } = mockAdMobInterstitial();

      setAdUnitID.mockRejectedValue("fake setAdUnitID error");

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeDefined();

      // an error occurs
      expect(logError).toHaveBeenCalledWith("fake setAdUnitID error");

      pickVideoAndConfirmPlayIsCalled(screen, mocks);
    });

    it("catches the error and still allows the video to play when there is an issue requesting an ad", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockDocumentPicker.returnWithASelectedFile();
      const { requestAdAsync } = mockAdMobInterstitial();

      requestAdAsync.mockRejectedValue("fake requestAdAsync error");

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeDefined();

      // an error occurs
      expect(logError).toHaveBeenCalledWith("fake requestAdAsync error");

      await pickVideoAndConfirmPlayIsCalled(screen, mocks);
    });

    it("catches the error and still allows the video to play when there is an issue confirming the ad is ready to show", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockDocumentPicker.returnWithASelectedFile();
      const { getIsReadyAsync } = mockAdMobInterstitial();

      getIsReadyAsync.mockRejectedValue("fake getIsReadyAsync error");

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeDefined();

      // No error initially
      expect(logError).not.toHaveBeenCalled();

      await pickVideoAndConfirmPlayIsCalled(screen, mocks);

      // an error occurs
      expect(logError).toHaveBeenCalledWith("fake getIsReadyAsync error");
    });

    it("catches the error and still allows the video to play when there is an issue showing the ad", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockDocumentPicker.returnWithASelectedFile();
      const { showAdAsync } = mockAdMobInterstitial();

      showAdAsync.mockRejectedValue("fake showAdAsync error");

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeDefined();

      // No error initially
      expect(logError).not.toHaveBeenCalled();

      await pickVideoAndConfirmPlayIsCalled(screen, mocks);

      // an error occurs
      expect(logError).toHaveBeenCalledWith("fake showAdAsync error");
    });

    it("catches the error and still allows the video to play when there is an issue requesting an ad for the second time", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockDocumentPicker.returnWithASelectedFile();
      const { requestAdAsync } = mockAdMobInterstitial();

      requestAdAsync.mockResolvedValueOnce();
      requestAdAsync.mockRejectedValueOnce("fake requestAdAsync error");
      requestAdAsync.mockResolvedValue();

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeDefined();

      // No error initially
      expect(logError).not.toHaveBeenCalled();

      // View video to view ad an load next ad
      await pickVideoAndConfirmPlayIsCalled(screen, mocks);

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
      await pickVideoAndConfirmPlayIsCalled(screen, mocks);

      expect(logError).toHaveBeenCalledTimes(0);
    });

    const pickVideoAndConfirmPlayIsCalled = async (screen, mocks) => {
      mocks.load.mockClear();
      mocks.play.mockClear();

      const loadViewButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeDefined();

      // Able to load a video
      await asyncPressEvent(loadViewButton);
      await act(async () => {});
      expect(mocks.load).toHaveBeenCalledTimes(1);
      await waitForExpect(async () => {
        expect(mocks.play).toHaveBeenCalledTimes(1);
      });
    };
  });

  it.todo("unload video sad path");
  it.todo("load video sad path");
  it.todo("plays video when on is selected");
});

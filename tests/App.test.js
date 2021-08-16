jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");

import { act, cleanup, within } from "@testing-library/react-native";
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
} from "./test-utils";
import { mockAdMobInterstitial } from "./mocks/mock-ad-mob";
import { mockDocumentPicker } from "./mocks/mock-document-picker";
import { mockLogError } from "./mocks/mock-logger";
import { mockUseVideoPlayerRefs } from "./mocks/mock-use-video-player-refs";
import { goToErrorViewAfterFailToLoadFromHomePage } from "./scenarios/go-to-error-view-after-fail-to-load-from-home-page";
import { startWatchingVideoFromHomeView } from "./scenarios/start-watching-video-from-home-view";
import { startWatchingVideoFromUpperControlBar } from "./scenarios/start-watching-video-from-the upper-control-bar";
import {
  findLeftVideoPlayer,
  findRightVideoPlayer,
} from "./component-queries/find-video-player";
import { RESIZE_MODES } from "../src/video-player/hooks/use-paired-video-players";

describe("App", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("First opening the app", () => {
    it("Shows a button to load a video", async () => {
      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );

      expect(loadViewButton).toBeTruthy();
      expect(
        within(loadViewButton).getByTestId("folderVideoIcon")
      ).toBeTruthy();
    });

    it("Shows a button to view the disable ads view", async () => {
      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeTruthy();

      const disableAdsButton = getButtonByText(within(homeView), "Disable ads");

      expect(disableAdsButton).toBeTruthy();
      expect(within(disableAdsButton).getByTestId("cancelIcon")).toBeTruthy();
    });

    it("Disables all lower bar controls while on the home page", async () => {
      const screen = await asyncRender(<App />);

      // Confirm the view we are on
      expect(screen.getByTestId("homeView")).toBeTruthy();

      // Confirm all buttons are disabled
      const lowerControlBar = screen.getByTestId("lowerControlBar");
      expect(lowerControlBar).toBeTruthy();

      const playButton = getButtonByChildTestId(
        within(lowerControlBar),
        "playIcon"
      );
      expect(playButton.props.testID).toBe("disabledButton");

      const playerTypeButton = getButtonByChildTestId(
        within(lowerControlBar),
        "screenDesktopIcon"
      );
      expect(playerTypeButton.props.testID).toBe("disabledButton");

      const screenStretchIcon = getButtonByChildTestId(
        within(lowerControlBar),
        "screenNormalIcon"
      );
      expect(screenStretchIcon.props.testID).toBe("disabledButton");

      const timeBar = within(lowerControlBar).getByTestId("timeBar");
      expect(timeBar.props.disabled).toBeTruthy();
    });

    it("Disables all side bar controls while on the home page", async () => {
      const screen = await asyncRender(<App />);

      // Confirm the view we are on
      expect(screen.getByTestId("homeView")).toBeTruthy();

      // Confirm buttons are disabled
      const sideBarLeft = screen.getByTestId("sidebarLeft");
      expect(sideBarLeft).toBeTruthy();

      const replaySidebarButton = getButtonByChildTestId(
        within(sideBarLeft),
        "replay10Icon"
      );
      expect(replaySidebarButton.props.testID).toBe("disabledButton");

      const sideBarRight = screen.getByTestId("sidebarRight");
      expect(sideBarRight).toBeTruthy();
      const forwardSidebarButton = getButtonByChildTestId(
        within(sideBarRight),
        "forward10Icon"
      );
      expect(forwardSidebarButton.props.testID).toBe("disabledButton");
    });

    it("Disables the back button on the upper bar controls while on the home page", async () => {
      const screen = await asyncRender(<App />);

      // Confirm the view we are on
      expect(screen.getByTestId("homeView")).toBeTruthy();

      const upperControlBar = screen.getByTestId("upperControlBar");
      expect(upperControlBar).toBeTruthy();

      const backButton = getButtonByChildTestId(
        within(upperControlBar),
        "iosArrowBackIcon"
      );

      expect(backButton.props.testID).toBe("disabledButton");
    });

    it("Shows an active button to load a video on the upper bar control", async () => {
      const screen = await asyncRender(<App />);

      expect(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      ).toBeTruthy();
    });
  });

  describe("Opening a video from the home view", () => {
    it("Opens the document viewer when the 'load a video' button is press", async () => {
      mockUseVideoPlayerRefs();

      jest
        .spyOn(DocumentPicker, "getDocumentAsync")
        .mockResolvedValue({ type: "cancel" });

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

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
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

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

      // loads ads a second time, the initial load and after the ads are shown
      expect(AdMobInterstitial.requestAdAsync).toHaveBeenCalledTimes(2);
    });

    it("plays video from the home view when one is selected", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeTruthy();

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });
    });

    describe("Opening a video from the home view but there is an issue with ads", () => {
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
        const { setAdUnitID, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();

        setAdUnitID.mockRejectedValue("fake setAdUnitID error");

        const screen = await asyncRender(<App />);
        const homeView = screen.getByTestId("homeView");
        expect(homeView).toBeTruthy();

        // an error occurs when setting the unit id on mount
        expect(logError).toHaveBeenCalledWith("fake setAdUnitID error");

        await startWatchingVideoFromHomeView({
          screen,
          videoPlayerMocks: mocks,
          getInterstitialDidCloseCallback,
        });
      });

      it("catches the error and still allows the video to play when there is an issue requesting an ad", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { requestAdAsync, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();

        requestAdAsync.mockRejectedValue("fake requestAdAsync error");

        const screen = await asyncRender(<App />);
        const homeView = screen.getByTestId("homeView");
        expect(homeView).toBeTruthy();

        // an error occurs when a request for an ad is made on mount
        expect(logError).toHaveBeenCalledWith("fake requestAdAsync error");

        await startWatchingVideoFromHomeView({
          screen,
          videoPlayerMocks: mocks,
          getInterstitialDidCloseCallback,
        });
      });

      it("catches the error and still allows the video to play when there is an issue confirming the ad is ready to show", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { getIsReadyAsync, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();

        getIsReadyAsync.mockRejectedValue("fake getIsReadyAsync error");

        const screen = await asyncRender(<App />);
        const homeView = screen.getByTestId("homeView");
        expect(homeView).toBeTruthy();

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
        const { showAdAsync, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();

        showAdAsync.mockRejectedValue("fake showAdAsync error");

        const screen = await asyncRender(<App />);
        const homeView = screen.getByTestId("homeView");
        expect(homeView).toBeTruthy();

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
        const { requestAdAsync, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();

        requestAdAsync.mockResolvedValueOnce();
        requestAdAsync.mockRejectedValueOnce("fake requestAdAsync error");
        requestAdAsync.mockResolvedValue();

        const screen = await asyncRender(<App />);
        const homeView = screen.getByTestId("homeView");
        expect(homeView).toBeTruthy();

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
        expect(backButton).toBeTruthy();
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

    describe("Opening a video from the home view but there is an issue the video player", () => {
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

  describe("Opening the disable ads view from the home view", () => {
    it("Opens the disable ads view when the 'disable ads' button is pressed", async () => {
      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeTruthy();

      const disableAdsButton = getButtonByText(within(homeView), "Disable ads");
      expect(disableAdsButton).toBeTruthy();

      // Press button to move to disable ads view
      await asyncPressEvent(disableAdsButton);

      // Confirm disable ad view is shown
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();
    });
  });

  describe("Opening a video from the upper control bar", () => {
    it("Is able to load and play a video with the button on the upper control bar", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });
    });

    it("shows an interstitial ad when opening a video", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      // Shows an ad
      expect(AdMobInterstitial.showAdAsync).toHaveBeenCalledTimes(1);
    });

    it("Does not open a second interstitial ad if another one was opened recently", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

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

    it.todo(
      "shows another ad if enough time passes between showing the first and second ad"
    );

    describe("Opening a video from the upper control bar but there is an issue with ads", () => {
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
        const { getInterstitialDidCloseCallback, setAdUnitID } =
          mockAdMobInterstitial();

        setAdUnitID.mockRejectedValue("fake setAdUnitID error");

        const screen = await asyncRender(<App />);

        // an error occurs when setting the unit id on mount
        expect(logError).toHaveBeenCalledWith("fake setAdUnitID error");

        await startWatchingVideoFromUpperControlBar({
          screen,
          videoPlayerMocks: mocks,
          getInterstitialDidCloseCallback,
        });
      });

      it("catches the error and still allows the video to play when there is an issue requesting an ad", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { getInterstitialDidCloseCallback, requestAdAsync } =
          mockAdMobInterstitial();

        requestAdAsync.mockRejectedValue("fake requestAdAsync error");

        const screen = await asyncRender(<App />);

        // an error occurs when a request for an ad is made on mount
        expect(logError).toHaveBeenCalledWith("fake requestAdAsync error");

        await startWatchingVideoFromUpperControlBar({
          screen,
          videoPlayerMocks: mocks,
          getInterstitialDidCloseCallback,
        });
      });

      it("catches the error and still allows the video to play when there is an issue confirming the ad is ready to show", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { getIsReadyAsync, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();

        getIsReadyAsync.mockRejectedValue("fake getIsReadyAsync error");

        const screen = await asyncRender(<App />);

        await startWatchingVideoFromUpperControlBar({
          screen,
          videoPlayerMocks: mocks,
          getInterstitialDidCloseCallback,
        });

        // an error occurs
        expect(logError).toHaveBeenCalledWith("fake getIsReadyAsync error");
      });

      it("catches the error and still allows the video to play when there is an issue showing the ad", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { showAdAsync, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();

        showAdAsync.mockRejectedValue("fake showAdAsync error");

        const screen = await asyncRender(<App />);

        await startWatchingVideoFromUpperControlBar({
          screen,
          videoPlayerMocks: mocks,
          getInterstitialDidCloseCallback,
        });

        // an error occurs
        expect(logError).toHaveBeenCalledWith("fake showAdAsync error");
      });

      it("catches the error and still allows the video to play when there is an issue requesting an ad for the second time", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { requestAdAsync, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();

        requestAdAsync.mockResolvedValueOnce();
        requestAdAsync.mockRejectedValueOnce("fake requestAdAsync error");
        requestAdAsync.mockResolvedValue();

        const screen = await asyncRender(<App />);

        // No error initially
        expect(logError).not.toHaveBeenCalled();

        // View video to view ad an load next ad
        await startWatchingVideoFromUpperControlBar({
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
        expect(backButton).toBeTruthy();
        await asyncPressEvent(backButton);

        // View video again without issues

        logError.mockClear();
        await startWatchingVideoFromUpperControlBar({
          screen,
          videoPlayerMocks: mocks,
          getInterstitialDidCloseCallback,
        });

        expect(logError).toHaveBeenCalledTimes(0);
      });
    });

    describe("Opening a video from the upper control bar but there is an issue with the video player", () => {
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
        const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

        const screen = await asyncRender(<App />);

        // Pick a new video
        await startWatchingVideoFromUpperControlBar({
          screen,
          videoPlayerMocks: mocks,
          getInterstitialDidCloseCallback,
        });

        // Pick another video as unload is only called if we have a video
        mocks.unload.mockRejectedValue(null);
        await asyncPressEvent(
          getButtonByChildTestId(
            within(screen.getByTestId("upperControlBar")),
            "folderVideoIcon"
          )
        );

        // Check the error page is shown due to the error when unloading the first video
        const errorView = screen.getByTestId("errorView");
        expect(errorView).toBeTruthy();
      });

      it("Shows the error page when attempting to open a video from the upper control bar but there is an issue loading the new video", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        mockDocumentPicker.returnWithASelectedFile();

        const screen = await asyncRender(<App />);

        // Pick a new video
        mocks.load.mockRejectedValue(null);
        await asyncPressEvent(
          getButtonByChildTestId(
            within(screen.getByTestId("upperControlBar")),
            "folderVideoIcon"
          )
        );

        // Check the error page is shown due to the error
        const errorView = screen.getByTestId("errorView");
        expect(errorView).toBeTruthy();
      });
    });
  });

  describe("Unloading a video and returning to the home view", () => {
    it("Is able to unload a video and return to the home view when the back button is pressed", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
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

      // confirm video is unloaded
      expect(mocks.unload).toHaveBeenCalledTimes(1);

      // confirm the home view is now visible
      expect(screen.getByTestId("homeView")).toBeTruthy();
    });
  });

  describe("Viewing the error view", () => {
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
        within(errorView).getByText(
          "Sorry, there was an issue playing the video"
        )
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

      expect(loadViewButton).toBeTruthy();
      expect(
        within(loadViewButton).getByTestId("folderVideoIcon")
      ).toBeTruthy();
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

    it("Disables all lower bar controls while on the home page", async () => {
      const { mocks } = mockUseVideoPlayerRefs();

      const screen = await asyncRender(<App />);

      await goToErrorViewAfterFailToLoadFromHomePage({
        screen,
        videoPlayerMocks: mocks,
        mockVideoFilepath: "./fake/file/path.jpeg",
      });

      // Confirm the view we are on
      expect(screen.getByTestId("errorView")).toBeTruthy();

      // Confirm all buttons are disabled
      const lowerControlBar = screen.getByTestId("lowerControlBar");
      expect(lowerControlBar).toBeTruthy();

      const playButton = getButtonByChildTestId(
        within(lowerControlBar),
        "playIcon"
      );
      expect(playButton.props.testID).toBe("disabledButton");

      const playerTypeButton = getButtonByChildTestId(
        within(lowerControlBar),
        "screenDesktopIcon"
      );
      expect(playerTypeButton.props.testID).toBe("disabledButton");

      const screenStretchIcon = getButtonByChildTestId(
        within(lowerControlBar),
        "screenNormalIcon"
      );
      expect(screenStretchIcon.props.testID).toBe("disabledButton");

      const timeBar = within(lowerControlBar).getByTestId("timeBar");
      expect(timeBar.props.disabled).toBeTruthy();
    });

    it("Disables all side bar controls while on the home page", async () => {
      const { mocks } = mockUseVideoPlayerRefs();

      const screen = await asyncRender(<App />);

      await goToErrorViewAfterFailToLoadFromHomePage({
        screen,
        videoPlayerMocks: mocks,
        mockVideoFilepath: "./fake/file/path.jpeg",
      });

      // Confirm the view we are on
      expect(screen.getByTestId("errorView")).toBeTruthy();

      // Confirm buttons are disabled
      const sideBarLeft = screen.getByTestId("sidebarLeft");
      expect(sideBarLeft).toBeTruthy();

      const replaySidebarButton = getButtonByChildTestId(
        within(sideBarLeft),
        "replay10Icon"
      );
      expect(replaySidebarButton.props.testID).toBe("disabledButton");

      const sideBarRight = screen.getByTestId("sidebarRight");
      expect(sideBarRight).toBeTruthy();
      const forwardSidebarButton = getButtonByChildTestId(
        within(sideBarRight),
        "forward10Icon"
      );
      expect(forwardSidebarButton.props.testID).toBe("disabledButton");
    });

    it("Can start playing a new video from the error page using the upper control bar", async () => {
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
      jest.clearAllMocks();
      mocks.load.mockResolvedValue(undefined);

      // Start watching a new video from the upper control bar
      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });
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
      expect(screen.getByTestId("errorView")).toBeTruthy();
    });

    it("Shows an ad when opening a video after the first attempt to open a video results in error, even if there is no delay between the two attempts to open the video", async () => {
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

    it("Clears the error and returns to the home view when the back button is pressed after an error occurs", async () => {
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
      expect(screen.getByTestId("homeView")).toBeTruthy();
    });
  });

  describe("Playing a video", () => {
    it("Enables the lower control bar buttons while a video is playing", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      // Confirm all buttons are disabled
      const lowerControlBar = screen.getByTestId("lowerControlBar");
      expect(lowerControlBar).toBeTruthy();

      const pauseButton = getButtonByChildTestId(
        within(lowerControlBar),
        "pauseIcon"
      );
      expect(pauseButton.props.testID).toBe("enabledButton");

      const playerTypeButton = getButtonByChildTestId(
        within(lowerControlBar),
        "screenDesktopIcon"
      );
      expect(playerTypeButton.props.testID).toBe("enabledButton");

      const screenStretchIcon = getButtonByChildTestId(
        within(lowerControlBar),
        "screenNormalIcon"
      );
      expect(screenStretchIcon.props.testID).toBe("enabledButton");

      const timeBar = within(lowerControlBar).getByTestId("timeBar");
      expect(timeBar.props.disabled).toBeFalsy();
    });

    it("Enables all side bar controls while on the home page", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      // Confirm buttons are disabled
      const sideBarLeft = screen.getByTestId("sidebarLeft");
      expect(sideBarLeft).toBeTruthy();

      const replaySidebarButton = getButtonByChildTestId(
        within(sideBarLeft),
        "replay10Icon"
      );
      expect(replaySidebarButton.props.testID).toBe("enabledButton");

      const sideBarRight = screen.getByTestId("sidebarRight");
      expect(sideBarRight).toBeTruthy();
      const forwardSidebarButton = getButtonByChildTestId(
        within(sideBarRight),
        "forward10Icon"
      );
      expect(forwardSidebarButton.props.testID).toBe("enabledButton");
    });

    it("Unloads the video and returns to the home view when the back button is pressed", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      // Return to home view with the back button
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      );

      // Video is unloaded
      expect(mocks.unload).toHaveBeenCalledTimes(1);

      // confirm the home view is now visible
      expect(screen.getByTestId("homeView")).toBeTruthy();
    });

    it("Can start playing a new video while watching a video using the upper control bar", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      // Reset mocks before attempting to open a new video
      jest.clearAllMocks();

      // Start watching a new video from the upper control bar
      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        // Ads were shown recently so don't need to call InterstitialDidClose callback
        getInterstitialDidCloseCallback: undefined,
      });
    });

    it("Can pause a video while one is playing", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      // Press the pause button
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "pauseIcon"
        )
      );

      // Confirm pause was called
      expect(mocks.pause).toHaveBeenCalledTimes(1);
    });

    it("Can start playing a video after pausing it", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      // Press the pause button
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "pauseIcon"
        )
      );

      // Confirm pause was called
      expect(mocks.pause).toHaveBeenCalledTimes(1);

      // Press the play button
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "playIcon"
        )
      );

      // Confirm play was called
      expect(mocks.pause).toHaveBeenCalledTimes(1);
    });

    it("Can swap between showing two video players and one", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      // Confirm the video player starts with two players showing
      expect(findLeftVideoPlayer(screen).props.style.width).toBe("50%");
      expect(findRightVideoPlayer(screen).props.style.width).toBe("50%");

      // Switch to using one video player

      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "screenDesktopIcon"
        )
      );

      // Confirm video player is showing one player

      expect(findLeftVideoPlayer(screen).props.style.width).toBe("100%");
      expect(findRightVideoPlayer(screen).props.style.width).toBe("0%");

      // Switch to using two video players
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "vrHeadsetIcon"
        )
      );

      // Confirm the video player is showing two players again

      expect(findLeftVideoPlayer(screen).props.style.width).toBe("50%");
      expect(findRightVideoPlayer(screen).props.style.width).toBe("50%");
    });

    it("Can switch video player resize modes", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      // Confirm the video player uses the resizeMode cover as default
      expect(findLeftVideoPlayer(screen).props.resizeMode).toBe(
        RESIZE_MODES.RESIZE_MODE_COVER
      );
      expect(findRightVideoPlayer(screen).props.resizeMode).toBe(
        RESIZE_MODES.RESIZE_MODE_COVER
      );

      // Change to the next resize mode
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "screenNormalIcon"
        )
      );

      // Confirm the video player resizeMode has updated to contain
      expect(findLeftVideoPlayer(screen).props.resizeMode).toBe(
        RESIZE_MODES.RESIZE_MODE_CONTAIN
      );
      expect(findRightVideoPlayer(screen).props.resizeMode).toBe(
        RESIZE_MODES.RESIZE_MODE_CONTAIN
      );

      // Change to the next resize mode
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "fitScreenIcon"
        )
      );

      // Confirm the video player resizeMode has updated to stretch
      expect(findLeftVideoPlayer(screen).props.resizeMode).toBe(
        RESIZE_MODES.RESIZE_MODE_STRETCH
      );
      expect(findRightVideoPlayer(screen).props.resizeMode).toBe(
        RESIZE_MODES.RESIZE_MODE_STRETCH
      );

      // Change to the next resize mode
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "stretchToPageIcon"
        )
      );

      // Confirm the video player resizeMode returns to the default of cover
      expect(findLeftVideoPlayer(screen).props.resizeMode).toBe(
        RESIZE_MODES.RESIZE_MODE_COVER
      );
      expect(findRightVideoPlayer(screen).props.resizeMode).toBe(
        RESIZE_MODES.RESIZE_MODE_COVER
      );
    });
  });
});

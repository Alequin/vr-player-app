jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");
jest.mock("../secrets.json", () => ({
  bannerAdId: "ca-app-pub-5186020037332344/1196513783",
  videoSelectAdId: "ca-app-pub-5186020037332344/1879040064",
  disableAdsRewardId: "ca-app-pub-5186020037332344/3000550049",
  googleMobileAdsAppId: "ca-app-pub-5186020037332344~5459192428",
  isPayedVersion: false,
}));
jest.mock("expo-linking", () => ({
  openSettings: jest.fn(),
}));

import { act, cleanup, within } from "@testing-library/react-native";
import { AdMobInterstitial } from "expo-ads-admob";
import * as Linking from "expo-linking";
import * as MediaLibrary from "expo-media-library";
import { last } from "lodash";
import React from "React";
import { Alert } from "react-native";
import waitForExpect from "wait-for-expect";
import { App } from "../App";
import { delay } from "../src/delay";
import { logError } from "../src/logger";
import { minutesToMilliseconds } from "../src/minutes-to-milliseconds";
import * as asyncStorage from "../src/video-player/async-storage";
import { millisecondsToTimeWithoutHours } from "../src/video-player/components/utils";
import * as hasEnoughTimePastToShowInterstitialAd from "../src/video-player/hooks/has-enough-time-past-to-show-interstitial-ad";
import {
  EXTREME_OUT_OF_SYNC_MILLISECOND_DIFFERENCE,
  MAX_IN_SYNC_MILLISECOND_DIFFERENCE,
} from "../src/video-player/hooks/resync-videos";
import {
  PLAYER_MODES,
  RESIZE_MODES,
} from "../src/video-player/hooks/use-paired-video-players";
import { mockAdMobInterstitial, mockAdMobRewarded } from "./mocks/mock-ad-mob";
import { mockAdsAreDisabled } from "./mocks/mock-ads-are-disabled";
import * as mockAppState from "./mocks/mock-app-state";
import { mockBackHandlerCallback } from "./mocks/mock-back-handler-callback";
import { mockLogError } from "./mocks/mock-logger";
import { mockMediaLibrary } from "./mocks/mock-media-library";
import { mockUseVideoPlayerRefs } from "./mocks/mock-use-video-player-refs";
import { goToErrorViewAfterFailToLoadFromHomePage } from "./scenarios/go-to-error-view-after-fail-to-load-from-home-page";
import { startWatchingVideoFromHomeView } from "./scenarios/start-watching-video-from-home-view";
import { startWatchingVideoFromUpperControlBar } from "./scenarios/start-watching-video-from-the upper-control-bar";
import {
  asyncPressEvent,
  asyncRender,
  buttonProps,
  enableAllErrorLogs,
  getButtonByChildTestId,
  getButtonByText,
  getTimeBarProps,
  silenceAllErrorLogs,
  videoPlayerProps,
} from "./test-utils";

describe("App", () => {
  beforeEach(() => {
    jest.spyOn(asyncStorage.playerMode, "load").mockResolvedValue(undefined);
    jest.spyOn(asyncStorage.resizeMode, "load").mockResolvedValue(undefined);
    jest
      .spyOn(asyncStorage.videoSortOrder, "load")
      .mockResolvedValue(undefined);
    jest
      .spyOn(asyncStorage.adsDisabledTime, "load")
      .mockResolvedValue(undefined);
    jest.clearAllMocks();

    mockMediaLibrary.grantedPermission();
  });

  afterEach(() => {
    cleanup();
    enableAllErrorLogs();
  });

  describe("First opening the app", () => {
    it("Checks if the user has given permission to use the media library and requests they give permission if they have not", async () => {
      mockUseVideoPlayerRefs();
      const { mockRequestPermissionsAsync } =
        mockMediaLibrary.undeterminedPermissions();

      const screen = await asyncRender(<App />);

      // Confirm permissions have been requested from the user
      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);

      // Confirm a button is shown asking the user to give permission
      const permissionsButton = getButtonByText(
        screen,
        "You will need to grant the app permission to view media files"
      );

      expect(permissionsButton).toBeTruthy();
      expect(
        within(permissionsButton).queryByText(
          "in order to select videos to watch"
        )
      ).toBeTruthy();
      expect(
        within(permissionsButton).queryByText(
          "Press to give permission to access media files"
        )
      ).toBeTruthy();

      // Press the button to request permissions again
      await asyncPressEvent(permissionsButton);
      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(2);
    });

    it("Directs the user to update permissions from the mobile settings page if permissions cannot be requested again within the app", async () => {
      mockUseVideoPlayerRefs();
      const { mockRequestPermissionsAsync } =
        mockMediaLibrary.rejectedPermissions();

      const screen = await asyncRender(<App />);

      // Confirm permissions have been requested from the user
      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);

      // Confirm a button is shown asking the user to give permission
      const permissionsButton = getButtonByText(
        screen,
        "You will need to grant the app permission to view media files"
      );

      expect(permissionsButton).toBeTruthy();
      expect(
        within(permissionsButton).queryByText(
          "in order to select videos to watch"
        )
      ).toBeTruthy();
      expect(
        within(permissionsButton).queryByText(
          "Press to view the settings page and update permissions"
        )
      ).toBeTruthy();

      // Press the button to send the user to the settings page to update permissions
      await asyncPressEvent(permissionsButton);
      expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    });

    it("Checks the media library permissions given by the user when the app state changes from 'background' to 'active'", async () => {
      mockUseVideoPlayerRefs();
      const { mockGetPermissionsAsync } =
        mockMediaLibrary.undeterminedPermissions();
      const updateAppState = mockAppState.mockAppStateUpdate();

      const screen = await asyncRender(<App />);

      // The permission status is checked initially
      expect(mockGetPermissionsAsync).toHaveBeenCalledTimes(1);

      // Confirm a button is shown asking the user to give permission
      const permissionsButton = getButtonByText(
        screen,
        "You will need to grant the app permission to view media files"
      );
      expect(permissionsButton).toBeTruthy();

      // Update app state so the app is in the background
      await updateAppState("background");

      // Confirm no more checks have been made since the initial check
      expect(mockGetPermissionsAsync).toHaveBeenCalledTimes(1);

      // Update app state so the app is active again
      await updateAppState("active");

      // Confirm the permissions status is checked again after app becomes active
      expect(mockGetPermissionsAsync).toHaveBeenCalledTimes(2);
    });

    it("Requests a list of the videos on the phone", async () => {
      mockUseVideoPlayerRefs();

      const { mockGetAssetsAsync } = mockMediaLibrary.singleAsset(
        `path/to/file-short.mp4`
      );

      await asyncRender(<App />);

      // Confirm the video files are requested
      expect(mockGetAssetsAsync).toHaveBeenCalledTimes(1);
      expect(mockGetAssetsAsync).toHaveBeenCalledWith({
        mediaType: MediaLibrary.MediaType.video,
        first: 100000,
      });
    });

    it("Requests a list of the videos on the phone again whenever the ", async () => {
      mockUseVideoPlayerRefs();
      const updateAppState = mockAppState.mockAppStateUpdate();

      const { mockGetAssetsAsync } = mockMediaLibrary.singleAsset(
        `path/to/file-short.mp4`
      );

      await asyncRender(<App />);

      // Confirm the video files are requested
      expect(mockGetAssetsAsync).toHaveBeenCalledTimes(1);
      expect(mockGetAssetsAsync).toHaveBeenCalledWith({
        mediaType: MediaLibrary.MediaType.video,
        first: 100000,
      });

      // Send app to background
      await updateAppState("background");

      // Confirm requests for files has not increased
      expect(mockGetAssetsAsync).toHaveBeenCalledTimes(1);

      await updateAppState("active");

      // Confirm another request for files was made
      expect(mockGetAssetsAsync).toHaveBeenCalledTimes(2);
    });

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

      expect(buttonProps(playButton).disabled).toBeTruthy();

      const playerTypeButton = getButtonByChildTestId(
        within(lowerControlBar),
        "screenDesktopIcon"
      );
      expect(buttonProps(playerTypeButton).disabled).toBeTruthy();

      const screenStretchButton = getButtonByChildTestId(
        within(lowerControlBar),
        "screenNormalIcon"
      );
      expect(buttonProps(screenStretchButton).disabled).toBeTruthy();

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
      expect(buttonProps(replaySidebarButton).disabled).toBeTruthy();

      const sideBarRight = screen.getByTestId("sidebarRight");
      expect(sideBarRight).toBeTruthy();
      const forwardSidebarButton = getButtonByChildTestId(
        within(sideBarRight),
        "forward10Icon"
      );
      expect(buttonProps(forwardSidebarButton).disabled).toBeTruthy();
    });

    it("Shows the expected icons on the upper control bar while on the home view", async () => {
      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeTruthy();

      // Confirm the expected icons on on the upper control bar
      expect(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      ).toBeTruthy();
      expect(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      ).toBeTruthy();

      expect(
        within(screen.getByTestId("upperControlBar")).getAllByRole("button")
      ).toHaveLength(2);
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

      expect(buttonProps(backButton).disabled).toBeTruthy();
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

    it("Shows a banner ad on the home view", async () => {
      const screen = await asyncRender(<App />);

      // Confirm the current view
      expect(screen.getByTestId("homeView"));

      // Check ad banner is visible
      expect(screen.queryByTestId("bannerAd")).toBeTruthy();
    });

    it("Hide the banner ad on the home view if ads are disabled", async () => {
      mockAdsAreDisabled();
      const screen = await asyncRender(<App />);

      // Confirm the current view
      expect(screen.getByTestId("homeView"));

      // Check ad banner is not visible
      expect(screen.queryByTestId("bannerAd")).not.toBeTruthy();
    });
  });

  describe("Selecting a video", () => {
    it("Opens the 'select a video' view when the 'load a video' button is press on the 'home' view", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("file");

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

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();
    });

    it("Opens the 'select a video' view when the button on the upper control bar is pressed", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("file");

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      );

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();
    });

    it("Opens the 'select a video' view and shows a loading indicator while loading the video file names", async (done) => {
      mockUseVideoPlayerRefs();
      const { mockGetAssetsAsync } = mockMediaLibrary.singleAsset("file");

      // Fake a delay in fetching the video file paths
      mockGetAssetsAsync.mockImplementation(async () => await delay(60_000));

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

      // Confirm the loading indicator on the 'select a video' view is shown
      expect(screen.getByTestId("selectVideoViewLoading")).toBeTruthy();

      done();
    });

    it("Shows a list of videos to watch on the 'select a video' view", async () => {
      mockUseVideoPlayerRefs();

      const { mockGetAssetsAsync } = mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-short.mp4`,
          filename: `file-short.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01"),
        },
        {
          uri: `path/to/file-mid.mp4`,
          filename: `file-mid.mp4`,
          duration: 630, // 10 minutes 30 seconds
          modificationTime: new Date("2020-08-15"),
        },
        {
          uri: `path/to/file-long.mp4`,
          filename: `file-long.mp4`,
          duration: 7800, // 2 hours 10 minutes
          modificationTime: new Date("2020-07-23"),
        },
      ]);

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

      // Confirm we are taken to the "select a video" page
      const selectVideoView = screen.getByTestId("selectVideoView");
      expect(selectVideoView).toBeTruthy();

      // Confirm the video files are requested
      expect(mockGetAssetsAsync).toHaveBeenCalledTimes(1);
      expect(mockGetAssetsAsync).toHaveBeenCalledWith({
        mediaType: MediaLibrary.MediaType.video,
        first: 100000,
      });

      // Confirm the short videos button is visible
      const shortVideoButton = getButtonByText(
        within(selectVideoView),
        `file-short.mp4`
      );

      expect(shortVideoButton).toBeTruthy();
      expect(within(shortVideoButton).queryByTestId("videoIcon")).toBeTruthy();
      expect(within(shortVideoButton).queryByText("00:30")).toBeTruthy();
      expect(within(shortVideoButton).queryByText("Sept 1 2020")).toBeTruthy();

      // Confirm the mid videos button is visible
      const midVideoButton = getButtonByText(
        within(selectVideoView),
        `file-mid.mp4`
      );

      expect(midVideoButton).toBeTruthy();
      expect(within(midVideoButton).queryByTestId("videoIcon")).toBeTruthy();
      expect(within(midVideoButton).queryByText("10:30")).toBeTruthy();
      expect(within(midVideoButton).queryByText("Aug 15 2020")).toBeTruthy();

      // Confirm the long videos button is visible
      const longVideoButton = getButtonByText(
        within(selectVideoView),
        `file-long.mp4`
      );

      expect(longVideoButton).toBeTruthy();
      expect(within(longVideoButton).queryByTestId("videoIcon")).toBeTruthy();
      expect(within(longVideoButton).queryByText("02:10:00")).toBeTruthy();
      expect(within(longVideoButton).queryByText("Jul 23 2020")).toBeTruthy();
    });

    it("Shows the expected icons on the upper control bar while on the 'select a video' view", async () => {
      mockMediaLibrary.singleAsset("file");

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

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();

      // Confirm the expected icons on on the upper control bar
      expect(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      ).toBeTruthy();
      expect(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "sortAmountAscIcon"
        )
      ).toBeTruthy();
      expect(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "refreshIcon"
        )
      ).toBeTruthy();

      expect(
        within(screen.getByTestId("upperControlBar")).getAllByRole("button")
      ).toHaveLength(3);
    });

    it("Disables all lower bar controls while on the select a video view", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("file");

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

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();

      // Confirm all buttons are disabled
      const lowerControlBar = screen.getByTestId("lowerControlBar");
      expect(lowerControlBar).toBeTruthy();

      const playButton = getButtonByChildTestId(
        within(lowerControlBar),
        "playIcon"
      );

      expect(buttonProps(playButton).disabled).toBeTruthy();

      const playerTypeButton = getButtonByChildTestId(
        within(lowerControlBar),
        "screenDesktopIcon"
      );
      expect(buttonProps(playerTypeButton).disabled).toBeTruthy();

      const screenStretchButton = getButtonByChildTestId(
        within(lowerControlBar),
        "screenNormalIcon"
      );
      expect(buttonProps(screenStretchButton).disabled).toBeTruthy();

      const timeBar = within(lowerControlBar).getByTestId("timeBar");
      expect(timeBar.props.disabled).toBeTruthy();
    });

    it("Disables all side bar controls while on the select a video view", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("file");

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

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();

      // Confirm buttons are disabled
      const sideBarLeft = screen.getByTestId("sidebarLeft");
      expect(sideBarLeft).toBeTruthy();

      const replaySidebarButton = getButtonByChildTestId(
        within(sideBarLeft),
        "replay10Icon"
      );
      expect(buttonProps(replaySidebarButton).disabled).toBeTruthy();

      const sideBarRight = screen.getByTestId("sidebarRight");
      expect(sideBarRight).toBeTruthy();
      const forwardSidebarButton = getButtonByChildTestId(
        within(sideBarRight),
        "forward10Icon"
      );
      expect(buttonProps(forwardSidebarButton).disabled).toBeTruthy();
    });

    describe("It shows the correct shorthand for each month", () => {
      it.each([
        ["2020-01-01", "Jan"],
        ["2020-02-01", "Feb"],
        ["2020-03-01", "Mar"],
        ["2020-04-01", "Apr"],
        ["2020-05-01", "May"],
        ["2020-06-01", "Jun"],
        ["2020-07-01", "Jul"],
        ["2020-08-01", "Aug"],
        ["2020-09-01", "Sept"],
        ["2020-10-01", "Oct"],
        ["2020-11-01", "Nov"],
        ["2020-12-01", "Dec"],
      ])(
        "It shows the correct shorthand for the month when the date is %s",
        async (actualDate, expectedShorthandForMonth) => {
          mockUseVideoPlayerRefs();

          mockMediaLibrary.multipleAssets([
            {
              uri: `path/to/file.mp4`,
              filename: `file.mp4`,
              duration: 30,
              modificationTime: new Date(actualDate),
            },
          ]);

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

          // Confirm we are taken to the "select a video" page
          const selectVideoView = screen.getByTestId("selectVideoView");
          expect(selectVideoView).toBeTruthy();

          expect(
            within(
              getButtonByText(within(selectVideoView), `file.mp4`)
            ).queryByText(`${expectedShorthandForMonth} 1 2020`)
          ).toBeTruthy();
        }
      );
    });

    it("Does not show the year if it is the current year", async () => {
      mockUseVideoPlayerRefs();

      const modificationTime = new Date();
      modificationTime.setMonth(0);
      modificationTime.setDate(1);

      mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file.mp4`,
          filename: `file.mp4`,
          duration: 30,
          modificationTime: modificationTime.getTime(),
        },
      ]);

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

      // Confirm we are taken to the "select a video" page
      const selectVideoView = screen.getByTestId("selectVideoView");
      expect(selectVideoView).toBeTruthy();

      expect(
        within(
          getButtonByText(within(selectVideoView), `file.mp4`)
        ).queryByText(`Jan 1`)
      ).toBeTruthy();
    });

    it("Can start playing a video after the user selects one", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file");

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeTruthy();

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file",
      });
    });

    it("Can start playing a video after the user selects one", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file");

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeTruthy();

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file",
      });
    });

    it("Encodes file uri's which include a '#' character to avoid loading issues", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("path/to/file#1.mp4");

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeTruthy();

      // Play the video and confirm the correct functions are called
      const loadViewButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeDefined();

      // Press button to load video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();

      // Select the first video option
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          "path/to/file#1.mp4"
        )
      );

      expect(mocks.load).toHaveBeenCalledWith(
        { filename: "path/to/file#1.mp4", uri: "path/to/file%231.mp4" },
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
    });

    it("Checks if the user has given permission to use the media library and does not requests access if they have", async () => {
      mockUseVideoPlayerRefs();
      const { mockRequestPermissionsAsync } =
        mockMediaLibrary.singleAsset("path/to/file#1.mp4");

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

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();

      // Confirm permissions where checked
      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);

      // Confirm a video button is shown
      expect(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          "path/to/file#1.mp4"
        )
      ).toBeTruthy();
    });

    it("Gives the options to sort the the video buttons and change how they are sorted", async () => {
      mockUseVideoPlayerRefs();

      mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-mid.mp4`,
          filename: `file-mid.mp4`,
          duration: 7800,
          modificationTime: new Date("2020-08-15"),
        },
        {
          uri: `path/to/file-newest.mp4`,
          filename: `file-newest.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01"),
        },

        {
          uri: `path/to/file-oldest.mp4`,
          filename: `file-oldest.mp4`,
          duration: 630,
          modificationTime: new Date("2020-07-23"),
        },
      ]);

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

      // Confirm we are taken to the "select a video" page
      const selectVideoView = screen.getByTestId("selectVideoView");
      expect(selectVideoView).toBeTruthy();

      // Confirm the sort button is available and defaults to "Newest to oldest"
      expect(
        getButtonByText(
          within(screen.getByTestId("upperControlBar")),
          "Newest to oldest"
        )
      ).toBeTruthy();

      // Confirm the initial order is "Newest to oldest"
      const sortedByNewestToOldest = within(
        screen.getByTestId("selectVideoView")
      ).queryAllByTestId("videoButton");

      expect(
        within(sortedByNewestToOldest[0]).queryByText(`file-newest.mp4`)
      ).toBeTruthy();
      expect(
        within(sortedByNewestToOldest[1]).queryByText(`file-mid.mp4`)
      ).toBeTruthy();
      expect(
        within(sortedByNewestToOldest[2]).queryByText(`file-oldest.mp4`)
      ).toBeTruthy();

      // Press the button to change the order to "Oldest to newest"
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("upperControlBar")),
          "Newest to oldest"
        )
      );
      expect(
        getButtonByText(
          within(screen.getByTestId("upperControlBar")),
          "Oldest to newest"
        )
      ).toBeTruthy();

      // Confirm the new order is "Oldest to newest"
      const sortedByOldestToNewest = within(
        screen.getByTestId("selectVideoView")
      ).queryAllByTestId("videoButton");

      expect(
        within(sortedByOldestToNewest[0]).queryByText(`file-oldest.mp4`)
      ).toBeTruthy();
      expect(
        within(sortedByOldestToNewest[1]).queryByText(`file-mid.mp4`)
      ).toBeTruthy();
      expect(
        within(sortedByOldestToNewest[2]).queryByText(`file-newest.mp4`)
      ).toBeTruthy();

      // Press the button to change the order to "A to Z"
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("upperControlBar")),
          "Oldest to newest"
        )
      );
      expect(
        getButtonByText(within(screen.getByTestId("upperControlBar")), "A to Z")
      ).toBeTruthy();

      // Confirm the new order is "A to Z"
      const sortedByAToZ = within(
        screen.getByTestId("selectVideoView")
      ).queryAllByTestId("videoButton");

      expect(within(sortedByAToZ[0]).queryByText(`file-mid.mp4`)).toBeTruthy();
      expect(
        within(sortedByAToZ[1]).queryByText(`file-newest.mp4`)
      ).toBeTruthy();
      expect(
        within(sortedByAToZ[2]).queryByText(`file-oldest.mp4`)
      ).toBeTruthy();

      // Press the button to change the order to "Z to A"
      await asyncPressEvent(
        getButtonByText(within(screen.getByTestId("upperControlBar")), "A to Z")
      );
      expect(
        getButtonByText(within(screen.getByTestId("upperControlBar")), "Z to A")
      ).toBeTruthy();

      // Confirm the new order is "Z to A"
      const sortedByZToA = within(
        screen.getByTestId("selectVideoView")
      ).queryAllByTestId("videoButton");

      expect(
        within(sortedByZToA[0]).queryByText(`file-oldest.mp4`)
      ).toBeTruthy();
      expect(
        within(sortedByZToA[1]).queryByText(`file-newest.mp4`)
      ).toBeTruthy();
      expect(within(sortedByZToA[2]).queryByText(`file-mid.mp4`)).toBeTruthy();

      // Press the button to change the order to "Longest to shortest"
      await asyncPressEvent(
        getButtonByText(within(screen.getByTestId("upperControlBar")), "Z to A")
      );
      expect(
        getButtonByText(
          within(screen.getByTestId("upperControlBar")),
          "Longest to shortest"
        )
      ).toBeTruthy();

      // Confirm the new order is "Longest to shortest"
      const sortedByLongestToShortest = within(
        screen.getByTestId("selectVideoView")
      ).queryAllByTestId("videoButton");

      expect(
        within(sortedByLongestToShortest[0]).queryByText(`file-mid.mp4`)
      ).toBeTruthy();
      expect(
        within(sortedByLongestToShortest[1]).queryByText(`file-oldest.mp4`)
      ).toBeTruthy();
      expect(
        within(sortedByLongestToShortest[2]).queryByText(`file-newest.mp4`)
      ).toBeTruthy();

      // Press the button to change the order to "Shortest to longest"
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("upperControlBar")),
          "Longest to shortest"
        )
      );
      expect(
        getButtonByText(
          within(screen.getByTestId("upperControlBar")),
          "Shortest to longest"
        )
      ).toBeTruthy();

      // Confirm the new order is "Shortest to longest"
      const sortedByShortestToLongest = within(
        screen.getByTestId("selectVideoView")
      ).queryAllByTestId("videoButton");

      expect(
        within(sortedByShortestToLongest[0]).queryByText(`file-newest.mp4`)
      ).toBeTruthy();
      expect(
        within(sortedByShortestToLongest[1]).queryByText(`file-oldest.mp4`)
      ).toBeTruthy();
      expect(
        within(sortedByShortestToLongest[2]).queryByText(`file-mid.mp4`)
      ).toBeTruthy();

      // Press the button to change the order back to the initial "Newest to oldest"
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("upperControlBar")),
          "Shortest to longest"
        )
      );
      expect(
        getButtonByText(
          within(screen.getByTestId("upperControlBar")),
          "Newest to oldest"
        )
      ).toBeTruthy();

      // Confirm the new order is "Newest to oldest"
      const sortedByNewestToOldestAgain = within(
        screen.getByTestId("selectVideoView")
      ).queryAllByTestId("videoButton");

      expect(
        within(sortedByNewestToOldestAgain[0]).queryByText(`file-newest.mp4`)
      ).toBeTruthy();
      expect(
        within(sortedByNewestToOldestAgain[1]).queryByText(`file-mid.mp4`)
      ).toBeTruthy();
      expect(
        within(sortedByNewestToOldestAgain[2]).queryByText(`file-oldest.mp4`)
      ).toBeTruthy();
    });

    it("Loads the last known video sort order and saves a new one when it changes", async () => {
      mockUseVideoPlayerRefs();

      mockMediaLibrary.singleAsset(`path/to/file-mid.mp4`);

      // Mock a saved video sort order
      jest.spyOn(asyncStorage.videoSortOrder, "load").mockResolvedValue(3);
      jest.spyOn(asyncStorage.videoSortOrder, "save");

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

      // Confirm we are taken to the "select a video" page
      const selectVideoView = screen.getByTestId("selectVideoView");
      expect(selectVideoView).toBeTruthy();

      // Confirm the sort order was loaded
      expect(asyncStorage.videoSortOrder.load).toHaveBeenCalledTimes(1);

      // Confirm the sort button is available and defaults to the saved sort order
      expect(
        getButtonByText(within(screen.getByTestId("upperControlBar")), "Z to A")
      ).toBeTruthy();

      // Update the sort order
      await asyncPressEvent(
        getButtonByText(within(screen.getByTestId("upperControlBar")), "Z to A")
      );

      // Confirm the new sort order was saved
      expect(asyncStorage.videoSortOrder.save).toHaveBeenCalledTimes(1);
      expect(asyncStorage.videoSortOrder.save).toHaveBeenCalledWith(4);
    });

    it("Reloads the list of videos when the refresh button is pressed", async () => {
      mockUseVideoPlayerRefs();

      const { mockGetAssetsAsync: firstMockGetAssetsAsync } =
        mockMediaLibrary.multipleAssets([
          {
            uri: `path/to/file-short.mp4`,
            filename: `file-short.mp4`,
            duration: 30,
            modificationTime: new Date("2020-09-01"),
          },
          {
            uri: `path/to/file-mid.mp4`,
            filename: `file-mid.mp4`,
            duration: 630, // 10 minutes 30 seconds
            modificationTime: new Date("2020-08-15"),
          },
          {
            uri: `path/to/file-long.mp4`,
            filename: `file-long.mp4`,
            duration: 7800, // 2 hours 10 minutes
            modificationTime: new Date("2020-07-23"),
          },
        ]);

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

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();

      // Confirm the video files are requested
      expect(firstMockGetAssetsAsync).toHaveBeenCalledTimes(1);

      // Confirm the expected video options are visible
      expect(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          `file-short.mp4`
        )
      ).toBeTruthy();
      expect(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          `file-mid.mp4`
        )
      ).toBeTruthy();
      expect(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          `file-long.mp4`
        )
      ).toBeTruthy();

      // Update the video options that will be returned
      const { mockGetAssetsAsync: secondMockGetAssetsAsync } =
        mockMediaLibrary.multipleAssets([
          {
            uri: `path/to/new-file-short.mp4`,
            filename: `new-file-short.mp4`,
            duration: 30,
            modificationTime: new Date("2020-09-01"),
          },
          {
            uri: `path/to/new-file-mid.mp4`,
            filename: `new-file-mid.mp4`,
            duration: 630, // 10 minutes 30 seconds
            modificationTime: new Date("2020-08-15"),
          },
          {
            uri: `path/to/new-file-long.mp4`,
            filename: `new-file-long.mp4`,
            duration: 7800, // 2 hours 10 minutes
            modificationTime: new Date("2020-07-23"),
          },
        ]);

      // Reload the video options
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "refreshIcon"
        )
      );

      // Confirm the video files are requested again
      expect(secondMockGetAssetsAsync).toHaveBeenCalledTimes(2);

      // Confirm the video options have updated
      expect(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          `new-file-short.mp4`
        )
      ).toBeTruthy();
      expect(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          `new-file-mid.mp4`
        )
      ).toBeTruthy();
      expect(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          `new-file-long.mp4`
        )
      ).toBeTruthy();
    });
  });

  describe("Opening a video from the home view", () => {
    it("Opens an interstitial ad when the 'load a video' button is press", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("path/to/file");
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

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();

      // Select the first video option
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          "path/to/file"
        )
      );

      // Checks if an ad is ready to show
      expect(AdMobInterstitial.getIsReadyAsync).toHaveBeenCalledTimes(1);

      // Shows an ad
      expect(AdMobInterstitial.showAdAsync).toHaveBeenCalledTimes(1);

      // loads ads a second time, the initial load and after the ads are shown
      expect(AdMobInterstitial.requestAdAsync).toHaveBeenCalledTimes(2);
    });

    it("Does not open an interstitial ad when the 'load a video' button is press if ads are disabled", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("path/to/file");
      mockAdMobInterstitial();

      jest.spyOn(AdMobInterstitial, "getIsReadyAsync").mockResolvedValue(true);
      mockAdsAreDisabled();

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

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();

      // Select the first video option
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          "path/to/file"
        )
      );

      // Shows an ad
      expect(AdMobInterstitial.showAdAsync).not.toHaveBeenCalledTimes(1);
    });

    it("plays video from the home view when one is selected", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeTruthy();

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });
    });

    describe("Opening a video from the home view but there is an issue with ads", () => {
      beforeEach(() => {
        silenceAllErrorLogs();
      });

      it("catches the error and still allows the video to play when there is an issue setting the interstitial unit id", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { setAdUnitID, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();
        mockMediaLibrary.singleAsset("path/to/file");

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
          mockVideoFilepath: "path/to/file",
        });
      });

      it("catches the error and still allows the video to play when there is an issue requesting an ad", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { requestAdAsync, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();
        mockMediaLibrary.singleAsset("path/to/file.mp4");

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
          mockVideoFilepath: "path/to/file.mp4",
        });
      });

      it("catches the error and still allows the video to play when there is an issue confirming the ad is ready to show", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { getIsReadyAsync, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();
        mockMediaLibrary.singleAsset("path/to/file.mp4");

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
          mockVideoFilepath: "path/to/file.mp4",
        });

        // an error occurs
        expect(logError).toHaveBeenCalledWith("fake getIsReadyAsync error");
      });

      it("catches the error and still allows the video to play when there is an issue showing the ad", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { showAdAsync, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();
        mockMediaLibrary.singleAsset("path/to/file");

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
          mockVideoFilepath: "path/to/file",
        });

        // an error occurs
        expect(logError).toHaveBeenCalledWith("fake showAdAsync error");
      });

      it("catches the error and still allows the video to play when there is an issue requesting an ad for the second time", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { requestAdAsync, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();
        mockMediaLibrary.singleAsset("path/to/file");

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
          mockVideoFilepath: "path/to/file",
        });

        // an error occurs
        expect(logError).toHaveBeenCalledWith("fake requestAdAsync error");

        // Return to 'select a video' view
        await asyncPressEvent(
          getButtonByChildTestId(
            within(screen.getByTestId("upperControlBar")),
            "iosArrowBackIcon"
          )
        );
        // Return to home view
        await asyncPressEvent(
          getButtonByChildTestId(
            within(screen.getByTestId("upperControlBar")),
            "iosArrowBackIcon"
          )
        );

        // View video again without issues
        logError.mockClear();
        await startWatchingVideoFromHomeView({
          screen,
          videoPlayerMocks: mocks,
          getInterstitialDidCloseCallback,
          mockVideoFilepath: "path/to/file",
        });

        expect(logError).not.toHaveBeenCalled();
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
        mockMediaLibrary.singleAsset("./fake/file/path.jpeg");

        const screen = await asyncRender(<App />);

        await goToErrorViewAfterFailToLoadFromHomePage({
          screen,
          videoPlayerMocks: mocks,
          mockVideoFilepath: "./fake/file/path.jpeg",
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
      mockMediaLibrary.singleAsset("path/to/file");

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file",
      });
    });

    it("shows an interstitial ad when opening a video", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file");

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file",
      });

      // Shows an ad
      expect(AdMobInterstitial.showAdAsync).toHaveBeenCalledTimes(1);
    });

    it("Does not show an interstitial ad when opening a video if ads are disabled", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file");

      mockAdsAreDisabled();

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        mockVideoFilepath: "path/to/file",
      });

      // Shows an ad
      expect(AdMobInterstitial.showAdAsync).not.toHaveBeenCalledTimes(1);
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

    it("shows another ad if enough time passes between showing the first and second ad", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file");

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file",
      });

      // Shows an ad
      expect(AdMobInterstitial.showAdAsync).toHaveBeenCalledTimes(1);

      const mock = jest
        .spyOn(
          hasEnoughTimePastToShowInterstitialAd,
          "hasEnoughTimePastToShowInterstitialAd"
        )
        .mockReturnValue(true);

      // Press button to pick another video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      );

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();

      // Select the first video option
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          "path/to/file"
        )
      );

      // Show another ad
      expect(AdMobInterstitial.showAdAsync).toHaveBeenCalledTimes(2);
    });

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
        mockMediaLibrary.singleAsset("path/to/file");

        setAdUnitID.mockRejectedValue("fake setAdUnitID error");

        const screen = await asyncRender(<App />);

        // an error occurs when setting the unit id on mount
        expect(logError).toHaveBeenCalledWith("fake setAdUnitID error");

        await startWatchingVideoFromUpperControlBar({
          screen,
          videoPlayerMocks: mocks,
          getInterstitialDidCloseCallback,
          mockVideoFilepath: "path/to/file",
        });
      });

      it("catches the error and still allows the video to play when there is an issue requesting an ad", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { getInterstitialDidCloseCallback, requestAdAsync } =
          mockAdMobInterstitial();
        mockMediaLibrary.singleAsset("path/to/file");

        requestAdAsync.mockRejectedValue("fake requestAdAsync error");

        const screen = await asyncRender(<App />);

        // an error occurs when a request for an ad is made on mount
        expect(logError).toHaveBeenCalledWith("fake requestAdAsync error");

        await startWatchingVideoFromUpperControlBar({
          screen,
          videoPlayerMocks: mocks,
          getInterstitialDidCloseCallback,
          mockVideoFilepath: "path/to/file",
        });
      });

      it("catches the error and still allows the video to play when there is an issue confirming the ad is ready to show", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { getIsReadyAsync, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();
        mockMediaLibrary.singleAsset("path/to/file");

        getIsReadyAsync.mockRejectedValue("fake getIsReadyAsync error");

        const screen = await asyncRender(<App />);

        await startWatchingVideoFromUpperControlBar({
          screen,
          videoPlayerMocks: mocks,
          getInterstitialDidCloseCallback,
          mockVideoFilepath: "path/to/file",
        });

        // an error occurs
        expect(logError).toHaveBeenCalledWith("fake getIsReadyAsync error");
      });

      it("catches the error and still allows the video to play when there is an issue showing the ad", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { showAdAsync, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();
        mockMediaLibrary.singleAsset("path/to/file");

        showAdAsync.mockRejectedValue("fake showAdAsync error");

        const screen = await asyncRender(<App />);

        await startWatchingVideoFromUpperControlBar({
          screen,
          videoPlayerMocks: mocks,
          getInterstitialDidCloseCallback,
          mockVideoFilepath: "path/to/file",
        });

        // an error occurs
        expect(logError).toHaveBeenCalledWith("fake showAdAsync error");
      });

      it("catches the error and still allows the video to play when there is an issue requesting an ad for the second time", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { requestAdAsync, getInterstitialDidCloseCallback } =
          mockAdMobInterstitial();
        mockMediaLibrary.singleAsset("path/to/file");

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
          mockVideoFilepath: "path/to/file",
        });

        // an error occurs
        expect(logError).toHaveBeenCalledWith("fake requestAdAsync error");

        // Return to 'select a video' view
        await asyncPressEvent(
          getButtonByChildTestId(
            within(screen.getByTestId("upperControlBar")),
            "iosArrowBackIcon"
          )
        );
        // Return to home view
        await asyncPressEvent(
          getButtonByChildTestId(
            within(screen.getByTestId("upperControlBar")),
            "iosArrowBackIcon"
          )
        );

        // View video again without issues
        logError.mockClear();
        await startWatchingVideoFromUpperControlBar({
          screen,
          videoPlayerMocks: mocks,
          getInterstitialDidCloseCallback,
          mockVideoFilepath: "path/to/file",
        });

        expect(logError).not.toHaveBeenCalled();
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

      it("Shows the error page when attempting to open a video from the upper control bar but there is an issue loading the new video", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        mockMediaLibrary.singleAsset("path/to/file");
        mocks.load.mockRejectedValue(null);

        const screen = await asyncRender(<App />);

        // Pick a new video
        await asyncPressEvent(
          getButtonByChildTestId(
            within(screen.getByTestId("upperControlBar")),
            "folderVideoIcon"
          )
        );

        // Confirm we are taken to the "select a video" page
        expect(screen.getByTestId("selectVideoView")).toBeTruthy();

        // Select the first video option
        await asyncPressEvent(
          getButtonByText(
            within(screen.getByTestId("selectVideoView")),
            "path/to/file"
          )
        );

        // Check the error page is shown due to the error
        const errorView = screen.getByTestId("errorView");
        expect(errorView).toBeTruthy();
      });
    });
  });

  describe("Unloading a video and returning to the home view", () => {
    it("Is able to unload a video and return to the 'select a video' view when the back button is pressed", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      // confirm the 'select a video' view is not visible
      expect(screen.queryByTestId("selectVideoView")).toBe(null);

      // Return to home view with the back button
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      );

      // confirm video is unloaded
      expect(mocks.unload).toHaveBeenCalledTimes(1);

      // confirm the 'select a video' view is now visible
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();
    });

    it("Is able to unload a video and return to the 'select a video' view when the hardware back button is pressed", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      const getMockBackHandlerCallback = mockBackHandlerCallback();

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      // confirm the 'select a video' view is not visible
      expect(screen.queryByTestId("selectVideoView")).toBe(null);

      // fire the event for the hardware back button
      const backHandlerCallback = getMockBackHandlerCallback();
      await act(async () => backHandlerCallback());

      // confirm video is unloaded
      expect(mocks.unload).toHaveBeenCalledTimes(1);

      // confirm the 'select a video' view is now visible
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();
    });

    it("Unmounts and remounts the main container to reset the app if there is an issue unloading the video", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();

      mocks.unload.mockRejectedValue(new Error("mock unload error"));

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
      });

      // confirm the main container is mounted
      expect(screen.queryByTestId("mainContainer")).toBeTruthy();

      // Return to home view with the back button to unload the video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      );

      silenceAllErrorLogs();

      // confirm the main container is unmounted
      await waitForExpect(() =>
        expect(screen.queryByTestId("mainContainer")).not.toBeTruthy()
      );

      // confirm the main container is mounted again
      await waitForExpect(() =>
        expect(screen.queryByTestId("mainContainer")).toBeTruthy()
      );
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
      mockMediaLibrary.singleAsset("./fake/file/path.jpeg");

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
      mockMediaLibrary.singleAsset("./fake/file/path.jpeg");

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
      mockMediaLibrary.singleAsset("./fake/file/path");

      const screen = await asyncRender(<App />);

      // Go to error page
      await goToErrorViewAfterFailToLoadFromHomePage({
        screen,
        videoPlayerMocks: mocks,
        mockVideoFilepath: "./fake/file/path",
      });

      // Reset mocks before attempting to open a new video
      mocks.load.mockResolvedValue(undefined);
      jest.clearAllMocks();

      // Load a new video from the error page
      const loadViewButton = getButtonByText(
        within(screen.getByTestId("errorView")),
        "Open a different video"
      );
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();

      // Select the first video option
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          "./fake/file/path"
        )
      );

      // Fire callback to start playing the video
      const fireDidCloseCallback = getInterstitialDidCloseCallback();
      act(fireDidCloseCallback);

      // confirm video is loaded and starts playing
      expect(mocks.load).toHaveBeenCalledTimes(1);
      expect(mocks.play).toHaveBeenCalledTimes(1);
    });

    it("Opens an interstitial ad when a new video is loaded", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("./fake/file/path");

      const screen = await asyncRender(<App />);

      // Go to error page
      await goToErrorViewAfterFailToLoadFromHomePage({
        screen,
        videoPlayerMocks: mocks,
        mockVideoFilepath: "./fake/file/path",
      });

      // Sets a unit ad id
      expect(AdMobInterstitial.setAdUnitID).toHaveBeenCalled();

      // Requests an ad to show
      expect(AdMobInterstitial.requestAdAsync).toHaveBeenCalled();

      // Reset mocks before attempting to open a new video
      mocks.load.mockResolvedValue(undefined);
      jest.clearAllMocks();

      // Load a new video from the error page
      const loadViewButton = getButtonByText(
        within(screen.getByTestId("errorView")),
        "Open a different video"
      );
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();

      // Select the first video option
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          "./fake/file/path"
        )
      );

      // Checks if an ad is ready to show
      expect(AdMobInterstitial.getIsReadyAsync).toHaveBeenCalledTimes(1);

      // Shows an ad
      expect(AdMobInterstitial.showAdAsync).toHaveBeenCalledTimes(1);

      // loads the next ad
      expect(AdMobInterstitial.requestAdAsync).toHaveBeenCalledTimes(1);
    });

    it("Does not open an interstitial ad when the 'load a video' button is press if ads are disabled", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("path/to/file");
      mockAdMobInterstitial();

      jest.spyOn(AdMobInterstitial, "getIsReadyAsync").mockResolvedValue(true);

      mockAdsAreDisabled();

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

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();

      // Select the first video option
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          "path/to/file"
        )
      );

      // Does not shows an ad
      expect(AdMobInterstitial.showAdAsync).not.toHaveBeenCalledTimes(1);
      // confirm the video starts playing
      expect(mocks.play).toHaveBeenCalledTimes(1);
    });

    it("Disables all lower bar controls while on the error view", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("./fake/file/path.jpeg");

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
      expect(buttonProps(playButton).disabled).toBeTruthy();

      const playerTypeButton = getButtonByChildTestId(
        within(lowerControlBar),
        "screenDesktopIcon"
      );
      expect(buttonProps(playerTypeButton).disabled).toBeTruthy();

      const screenStretchIcon = getButtonByChildTestId(
        within(lowerControlBar),
        "screenNormalIcon"
      );
      expect(buttonProps(screenStretchIcon).disabled).toBeTruthy();

      const timeBar = within(lowerControlBar).getByTestId("timeBar");
      expect(timeBar.props.disabled).toBeTruthy();
    });

    it("Disables all side bar controls while on the error view", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("./fake/file/path.jpeg");

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
      expect(buttonProps(replaySidebarButton).disabled).toBeTruthy();

      const sideBarRight = screen.getByTestId("sidebarRight");
      expect(sideBarRight).toBeTruthy();
      const forwardSidebarButton = getButtonByChildTestId(
        within(sideBarRight),
        "forward10Icon"
      );
      expect(buttonProps(forwardSidebarButton).disabled).toBeTruthy();
    });

    it("Shows the expected icons on the upper control bar while playing a video", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("./fake/file/path.jpeg");

      const screen = await asyncRender(<App />);

      await goToErrorViewAfterFailToLoadFromHomePage({
        screen,
        videoPlayerMocks: mocks,
        mockVideoFilepath: "./fake/file/path.jpeg",
      });

      // Confirm the view we are on
      expect(screen.getByTestId("errorView")).toBeTruthy();

      // Confirm the expected icons on on the upper control bar
      expect(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      ).toBeTruthy();
      expect(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      ).toBeTruthy();

      expect(
        within(screen.getByTestId("upperControlBar")).getAllByRole("button")
      ).toHaveLength(2);
    });

    it("Can start playing a new video from the error page using the upper control bar", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("./fake/file/path");

      const screen = await asyncRender(<App />);

      // Go to error page
      await goToErrorViewAfterFailToLoadFromHomePage({
        screen,
        videoPlayerMocks: mocks,
        mockVideoFilepath: "./fake/file/path",
      });

      // Reset mocks before attempting to open a new video
      jest.clearAllMocks();
      mocks.load.mockResolvedValue(undefined);

      // return to home view
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      );

      // Start watching a new video from the upper control bar
      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "./fake/file/path",
      });
    });

    it("Returns to the error page when attempting to open a video but there is an issue loading a new video", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("./fake/file/path.jpeg");

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

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();

      // Select the first video option
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          "./fake/file/path.jpeg"
        )
      );

      // Stay on the error page due to another error
      expect(screen.getByTestId("errorView")).toBeTruthy();
    });

    it("Shows an ad when opening a video after the first attempt to open a video results in error, even if there is no delay between the two attempts to open the video", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback, showAdAsync } =
        mockAdMobInterstitial();
      mockMediaLibrary.multipleAssets([
        {
          uri: "./fake/file/path.jpeg",
          filename: `path.jpeg`,
          duration: 30,
          modificationTime: new Date("2020-09-01"),
        },
        {
          uri: "path/to/file.mp4",
          filename: `file.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01"),
        },
      ]);

      const screen = await asyncRender(<App />);

      // Go to error page
      await goToErrorViewAfterFailToLoadFromHomePage({
        screen,
        videoPlayerMocks: mocks,
        mockVideoFilepath: `path.jpeg`,
      });

      // Reset mocks before attempting to open a new video
      mocks.load.mockResolvedValue(undefined);
      jest.clearAllMocks();

      // Load a new video from the error page
      const loadViewButton = getButtonByText(
        within(screen.getByTestId("errorView")),
        "Open a different video"
      );
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();

      // Select the first video option
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("selectVideoView")),
          `file.mp4`
        )
      );

      // Fire callback to start playing the video
      const fireDidCloseCallback = getInterstitialDidCloseCallback();
      act(fireDidCloseCallback);

      // confirm video is loaded and starts playing
      expect(mocks.load).toHaveBeenCalledTimes(1);
      expect(mocks.play).toHaveBeenCalledTimes(1);

      // confirm ads are shown
      expect(showAdAsync).toHaveBeenCalledTimes(1);
    });

    it("Clears the error and returns to the home view when the back button is pressed after an error occurs", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("./fake/file/path.jpeg");

      const screen = await asyncRender(<App />);

      await goToErrorViewAfterFailToLoadFromHomePage({
        screen,
        videoPlayerMocks: mocks,
        mockVideoFilepath: "./fake/file/path.jpeg",
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

    it("Clears the error and returns to the home view when the hardware back button is pressed after an error occurs", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const getMockBackHandlerCallback = mockBackHandlerCallback();
      mockMediaLibrary.singleAsset("./fake/file/path.jpeg");

      const screen = await asyncRender(<App />);

      await goToErrorViewAfterFailToLoadFromHomePage({
        screen,
        videoPlayerMocks: mocks,
        mockVideoFilepath: "./fake/file/path.jpeg",
      });

      // confirm the home view is not visible
      expect(screen.queryByTestId("homeView")).toBe(null);

      // fire the event for the hardware back button
      const backHandlerCallback = getMockBackHandlerCallback();

      await act(async () => backHandlerCallback());

      // confirm the home view is now visible
      expect(screen.getByTestId("homeView")).toBeTruthy();
    });

    it("Shows a banner ad on the error view", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("./fake/file/path.jpeg");

      const screen = await asyncRender(<App />);

      await goToErrorViewAfterFailToLoadFromHomePage({
        screen,
        videoPlayerMocks: mocks,
        mockVideoFilepath: "./fake/file/path.jpeg",
      });

      // Confirm the current view
      expect(screen.getByTestId("errorView"));

      // Check ad banner is visible
      expect(screen.queryByTestId("bannerAd")).toBeTruthy();
    });

    it("Hide the banner ad on the error view if ads are disabled", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("./fake/file/path.jpeg");

      mockAdsAreDisabled();

      const screen = await asyncRender(<App />);

      await goToErrorViewAfterFailToLoadFromHomePage({
        screen,
        videoPlayerMocks: mocks,
        mockVideoFilepath: "./fake/file/path.jpeg",
      });

      // Confirm the current view
      expect(screen.getByTestId("errorView"));

      // Check ad banner is not visible
      expect(screen.queryByTestId("bannerAd")).not.toBeTruthy();
    });
  });

  describe("Playing a video", () => {
    it("Enables the lower control bar buttons while a video is playing", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // Confirm all buttons are enabled
      const lowerControlBar = screen.getByTestId("lowerControlBar");
      expect(lowerControlBar).toBeTruthy();

      const pauseButton = getButtonByChildTestId(
        within(lowerControlBar),
        "pauseIcon"
      );
      expect(buttonProps(pauseButton).disabled).toBeFalsy();

      const playerTypeButton = getButtonByChildTestId(
        within(lowerControlBar),
        "screenDesktopIcon"
      );
      expect(buttonProps(playerTypeButton).disabled).toBeFalsy();

      const screenStretchButton = getButtonByChildTestId(
        within(lowerControlBar),
        "screenNormalIcon"
      );
      expect(buttonProps(screenStretchButton).disabled).toBeFalsy();

      const timeBar = within(lowerControlBar).getByTestId("timeBar");
      expect(timeBar.props.disabled).toBeFalsy();
    });

    it("Enables all side bar controls while a video is playing", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // Confirm buttons are enabled
      const sideBarLeft = screen.getByTestId("sidebarLeft");
      expect(sideBarLeft).toBeTruthy();

      const replaySidebarButton = getButtonByChildTestId(
        within(sideBarLeft),
        "replay10Icon"
      );
      expect(buttonProps(replaySidebarButton).disabled).toBeFalsy();

      const sideBarRight = screen.getByTestId("sidebarRight");
      expect(sideBarRight).toBeTruthy();
      const forwardSidebarButton = getButtonByChildTestId(
        within(sideBarRight),
        "forward10Icon"
      );
      expect(buttonProps(forwardSidebarButton).disabled).toBeFalsy();
    });

    it("Shows the expected icons on the upper control bar while playing a video", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // Confirm the expected icons on on the upper control bar
      expect(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      ).toBeTruthy();
      expect(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      ).toBeTruthy();

      expect(
        within(screen.getByTestId("upperControlBar")).getAllByRole("button")
      ).toHaveLength(2);
    });

    it("Unloads the video and returns to the 'select a video' view when the back button is pressed", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
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

      // confirm the select video view is now visible
      expect(screen.getByTestId("selectVideoView")).toBeTruthy();
    });

    it("Can start playing a new video while watching a video using the upper control bar", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // Reset mocks before attempting to open a new video
      jest.clearAllMocks();

      // Start watching a new video from the upper control bar
      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        // Ads were shown recently so don't need to call InterstitialDidClose callback
        getInterstitialDidCloseCallback: undefined,
        mockVideoFilepath: "path/to/file.mp4",
      });
    });

    it("Can pause a video while one is playing", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
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
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
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

    it("Can swap between video player modes and save the selected value", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      jest.spyOn(asyncStorage.playerMode, "save");

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // Confirm the video player starts with two players showing
      expect(
        videoPlayerProps(screen.getByTestId("leftVideoPlayer")).style.width
      ).toBe("50%");
      expect(
        videoPlayerProps(screen.getByTestId("rightVideoPlayer")).style.width
      ).toBe("50%");

      // Switch to using one video player
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "screenDesktopIcon"
        )
      );

      // confirm the change is saved
      expect(asyncStorage.playerMode.save).toHaveBeenCalledTimes(1);
      expect(asyncStorage.playerMode.save).toHaveBeenCalledWith(
        PLAYER_MODES.NORMAL_VIDEO
      );

      // Confirm video player is showing one player
      expect(
        videoPlayerProps(screen.getByTestId("leftVideoPlayer")).style.width
      ).toBe("100%");
      expect(
        videoPlayerProps(screen.getByTestId("rightVideoPlayer")).style.width
      ).toBe("0%");

      // Switch to using two video players
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "vrHeadsetIcon"
        )
      );

      // confirm the change is saved
      expect(asyncStorage.playerMode.save).toHaveBeenCalledTimes(2);
      expect(asyncStorage.playerMode.save).toHaveBeenCalledWith(
        PLAYER_MODES.VR_VIDEO
      );

      // Confirm the video player is showing two players again
      expect(
        videoPlayerProps(screen.getByTestId("leftVideoPlayer")).style.width
      ).toBe("50%");
      expect(
        videoPlayerProps(screen.getByTestId("rightVideoPlayer")).style.width
      ).toBe("50%");
    });

    it("Can load the saved video player mode", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      jest
        .spyOn(asyncStorage.playerMode, "load")
        .mockResolvedValue(PLAYER_MODES.NORMAL_VIDEO);

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // Confirm video player is showing one player
      expect(
        videoPlayerProps(screen.getByTestId("leftVideoPlayer")).style.width
      ).toBe("100%");
      expect(
        videoPlayerProps(screen.getByTestId("rightVideoPlayer")).style.width
      ).toBe("0%");
    });

    it("Can switch video player resize modes and save the selected value", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      jest.spyOn(asyncStorage.resizeMode, "save");

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // Confirm the video player uses the resizeMode cover as default
      expect(
        videoPlayerProps(screen.getByTestId("leftVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_COVER);
      expect(
        videoPlayerProps(screen.getByTestId("rightVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_COVER);

      // Change to the next resize mode
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "screenNormalIcon"
        )
      );

      // Saves the current resize mode
      expect(asyncStorage.resizeMode.save).toHaveBeenCalledTimes(1);
      expect(asyncStorage.resizeMode.save).toHaveBeenCalledWith(
        RESIZE_MODES.RESIZE_MODE_CONTAIN
      );

      // Confirm the video player resizeMode has updated to contain
      expect(
        videoPlayerProps(screen.getByTestId("leftVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_CONTAIN);
      expect(
        videoPlayerProps(screen.getByTestId("rightVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_CONTAIN);

      // Change to the next resize mode
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "fitScreenIcon"
        )
      );

      // Saves the current resize mode
      expect(asyncStorage.resizeMode.save).toHaveBeenCalledTimes(2);
      expect(asyncStorage.resizeMode.save).toHaveBeenCalledWith(
        RESIZE_MODES.RESIZE_MODE_STRETCH
      );

      // Confirm the video player resizeMode has updated to stretch
      expect(
        videoPlayerProps(screen.getByTestId("leftVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_STRETCH);
      expect(
        videoPlayerProps(screen.getByTestId("rightVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_STRETCH);

      // Change to the next resize mode
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "stretchToPageIcon"
        )
      );

      // Saves the current resize mode
      expect(asyncStorage.resizeMode.save).toHaveBeenCalledTimes(3);
      expect(asyncStorage.resizeMode.save).toHaveBeenCalledWith(
        RESIZE_MODES.RESIZE_MODE_COVER
      );

      // Confirm the video player resizeMode returns to the default of cover
      expect(
        videoPlayerProps(screen.getByTestId("leftVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_COVER);
      expect(
        videoPlayerProps(screen.getByTestId("rightVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_COVER);
    });

    it("Can load the saved resize mode", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      jest
        .spyOn(asyncStorage.resizeMode, "load")
        .mockResolvedValue(RESIZE_MODES.RESIZE_MODE_CONTAIN);

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // Confirm the video player uses the resizeMode contain
      expect(
        videoPlayerProps(screen.getByTestId("leftVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_CONTAIN);
      expect(
        videoPlayerProps(screen.getByTestId("rightVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_CONTAIN);
    });

    it("Sets the expected video duration on the timebar", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const expectedDuration = minutesToMilliseconds(10);
      mocks.getStatus.mockResolvedValue({
        primaryStatus: {
          positionMillis: 0,
          durationMillis: expectedDuration,
        },
        secondaryStatus: {
          positionMillis: 0,
          durationMillis: expectedDuration,
        },
      });

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      const lowerControlBar = screen.getByTestId("lowerControlBar");
      const timeBar = within(lowerControlBar).getByTestId("timeBar");

      expect(timeBar.props.minimumValue).toBe(0);
      expect(timeBar.props.maximumValue).toBe(expectedDuration);
    });

    it("starts the timebar at zero", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      const lowerControlBar = screen.getByTestId("lowerControlBar");
      const timeBar = within(lowerControlBar).getByTestId("timeBar");
      expect(timeBar.props.value).toBe(0);
    });

    it("increments the video position as time passes", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const expectedDuration = minutesToMilliseconds(10);
      let positionMillis = 0;
      mocks.getStatus.mockImplementation(async () => {
        // Fake time incrementing
        positionMillis = positionMillis + 100;

        return {
          primaryStatus: {
            positionMillis: positionMillis,
            durationMillis: expectedDuration,
          },
          secondaryStatus: {
            positionMillis: positionMillis,
            durationMillis: expectedDuration,
          },
        };
      });

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });
      const lowerControlBar = screen.getByTestId("lowerControlBar");
      const timeBar = within(lowerControlBar).getByTestId("timeBar");
      expect(timeBar.props.value).toBe(0);

      silenceAllErrorLogs();

      await waitForExpect(() => {
        expect(timeBar.props.value).toBeGreaterThan(1000);
        expect(within(lowerControlBar).getByText("00:01"));
      });
      await waitForExpect(() => {
        expect(timeBar.props.value).toBeLessThan(2000);
      });

      await waitForExpect(() => {
        expect(timeBar.props.value).toBeGreaterThan(2000);
        expect(within(lowerControlBar).getByText("00:02"));
      });
      await waitForExpect(() => {
        expect(timeBar.props.value).toBeLessThan(3000);
      });

      await waitForExpect(() => {
        expect(timeBar.props.value).toBeGreaterThan(3000);
        expect(within(lowerControlBar).getByText("00:03"));
      });
      await waitForExpect(() => expect(timeBar.props.value).toBeLessThan(4000));
    });

    it("shows the hour time units if the video duration is at least an hour long", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const videoDuration = minutesToMilliseconds(60);
      mocks.getStatus.mockResolvedValue({
        primaryStatus: {
          positionMillis: 0,
          durationMillis: videoDuration,
        },
        secondaryStatus: {
          positionMillis: 0,
          durationMillis: videoDuration,
        },
      });

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      const lowerControlBar = screen.getByTestId("lowerControlBar");

      // Confirm the correct time is shown
      expect(within(lowerControlBar).getByText("00:00:00")).toBeTruthy();
    });

    it("increases the hours indefinitely when the video length is very long", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const oneHour = minutesToMilliseconds(60);
      const videoDuration = oneHour * 10_000;
      const videoPosition = oneHour * 9_999;
      mocks.getStatus.mockResolvedValue({
        primaryStatus: {
          positionMillis: videoPosition,
          durationMillis: videoDuration,
        },
        secondaryStatus: {
          positionMillis: videoPosition,
          durationMillis: videoDuration,
        },
      });

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      const lowerControlBar = screen.getByTestId("lowerControlBar");

      // Confirm the correct time is shown
      silenceAllErrorLogs();
      await waitForExpect(() => {
        expect(within(lowerControlBar).getByText("9999:00:00")).toBeTruthy();
      });
    });
  });

  describe("Using the timebar to seek for a video position", () => {
    it("can update the current position by dragging the timebar", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      mocks.getStatus.mockImplementation(async () => ({
        primaryStatus: { positionMillis: 0, durationMillis: 1_000_000 },
        secondaryStatus: { positionMillis: 0, durationMillis: 1_000_000 },
      }));

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // Pause the video to ensure the position is controlled by the timebar
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "pauseIcon"
        )
      );

      const lowerControlBar = screen.getByTestId("lowerControlBar");
      const props = getTimeBarProps(
        within(lowerControlBar).getByTestId("timeBar")
      );

      const onSeekStart = props.onSlidingStart;
      const onSeekChange = props.onValueChange;
      const onSeekComplete = props.onSlidingComplete;

      const seekStartPosition = 10_000;

      // start seeking for the new video position
      await act(async () => onSeekStart(seekStartPosition));

      // Should not update the videos position until finished seeking
      expect(mocks.setPosition).not.toHaveBeenCalled();
      // Should update the visual time to respond to the user
      expect(within(lowerControlBar).getByText("00:10")).toBeTruthy();

      const dragBarPositions = new Array(100)
        .fill(null)
        .map((_, index) => seekStartPosition + (index + 1) * 1_000);

      // Drag the timebar
      for (const newPosition of dragBarPositions) {
        await act(async () => onSeekChange(newPosition));
        // Should still not update the videos position until finished seeking
        expect(mocks.setPosition).not.toHaveBeenCalled();
        // Should update the visual time to respond to the user
        expect(
          within(lowerControlBar).getByText(
            millisecondsToTimeWithoutHours(newPosition)
          )
        ).toBeTruthy();
      }

      // Finish seeking and end on the last position
      await act(async () => onSeekComplete(last(dragBarPositions)));

      // Updates the video position now seeking is complete
      expect(mocks.setPosition).toHaveBeenCalledTimes(1);
      expect(mocks.setPosition).toHaveBeenCalledWith(last(dragBarPositions));
      // Visual time is now where the user dragged it to
      expect(within(lowerControlBar).getByText("01:50")).toBeTruthy();
    });

    it("pauses the video while seeking with the timebar if it was playing in the beginning", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      mocks.getStatus.mockImplementation(async () => ({
        primaryStatus: { positionMillis: 0, durationMillis: 100_000 },
        secondaryStatus: { positionMillis: 0, durationMillis: 100_000 },
      }));

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      const lowerControlBar = screen.getByTestId("lowerControlBar");
      const props = getTimeBarProps(
        within(lowerControlBar).getByTestId("timeBar")
      );

      const onSeekStart = props.onSlidingStart;

      const seekStartPosition = 10_000;

      // start seeking for the new video position
      mocks.pause.mockClear();
      await act(async () => onSeekStart(seekStartPosition));

      // Pauses the video after starting to seek the video position
      expect(mocks.pause).toHaveBeenCalledTimes(1);
    });

    it("does not pause the video while seeking with the timebar if it was already paused", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      mocks.getStatus.mockImplementation(async () => ({
        primaryStatus: { positionMillis: 0, durationMillis: 100_000 },
        secondaryStatus: { positionMillis: 0, durationMillis: 100_000 },
      }));

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // Pause the video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "pauseIcon"
        )
      );

      const lowerControlBar = screen.getByTestId("lowerControlBar");
      const props = getTimeBarProps(
        within(lowerControlBar).getByTestId("timeBar")
      );

      const onSeekStart = props.onSlidingStart;

      const seekStartPosition = 10_000;

      // start seeking for the new video position
      mocks.pause.mockClear();
      await act(async () => onSeekStart(seekStartPosition));

      // Pauses the video after starting to seek the video position
      expect(mocks.pause).not.toHaveBeenCalled();
    });

    it("resumes the video after seeking with the timebar if it was playing in the beginning", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      mocks.getStatus.mockImplementation(async () => ({
        primaryStatus: { positionMillis: 0, durationMillis: 100_000 },
        secondaryStatus: { positionMillis: 0, durationMillis: 100_000 },
      }));

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      const lowerControlBar = screen.getByTestId("lowerControlBar");

      const onSeekStart = getTimeBarProps(
        within(lowerControlBar).getByTestId("timeBar")
      ).onSlidingStart;

      // start seeking for the new video position
      await act(async () => onSeekStart(10_000));

      const onSeekComplete = getTimeBarProps(
        within(lowerControlBar).getByTestId("timeBar")
      ).onSlidingComplete;

      // Finish seeking and end on the last position
      mocks.play.mockClear();
      await act(async () => onSeekComplete(10_000));

      // The video starts playing again
      expect(mocks.play).toHaveBeenCalledTimes(1);
    });

    it("does not resume the video after seeking with the timebar if it was already paused", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      mocks.getStatus.mockImplementation(async () => ({
        primaryStatus: { positionMillis: 0, durationMillis: 100_000 },
        secondaryStatus: { positionMillis: 0, durationMillis: 100_000 },
      }));

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // Pause the video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "pauseIcon"
        )
      );

      const lowerControlBar = screen.getByTestId("lowerControlBar");

      const onSeekStart = getTimeBarProps(
        within(lowerControlBar).getByTestId("timeBar")
      ).onSlidingStart;

      // start seeking for the new video position
      await act(async () => onSeekStart(10_000));

      const onSeekComplete = getTimeBarProps(
        within(lowerControlBar).getByTestId("timeBar")
      ).onSlidingComplete;

      // Finish seeking and end on the last position
      mocks.play.mockClear();
      await act(async () => onSeekComplete(10_000));

      // Does not start playing the video again
      expect(mocks.play).not.toHaveBeenCalled();
    });
  });

  describe("The two video players will always be in sync", () => {
    it("increases the playback rate of the secondary video player when the primary player is ahead", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      mocks.getStatus.mockImplementation(async () => ({
        primaryStatus: {
          positionMillis: MAX_IN_SYNC_MILLISECOND_DIFFERENCE + 1,
          durationMillis: 1000,
          rate: 1,
        },
        secondaryStatus: { positionMillis: 0, durationMillis: 1000, rate: 1 },
      }));

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      silenceAllErrorLogs();

      // Confirm the secondary video player rate is increased to re-sync
      await waitForExpect(() => {
        expect(mocks.setSecondaryRate).toHaveBeenCalledWith(1.1);
      });
    });

    it("reduces the playback rate of the secondary video after the secondary player beings to overtake the primary player", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      mocks.getStatus.mockImplementation(async () => ({
        primaryStatus: { positionMillis: 0, durationMillis: 1000, rate: 1 },
        secondaryStatus: {
          positionMillis: MAX_IN_SYNC_MILLISECOND_DIFFERENCE + 1,
          durationMillis: 1000,
          rate: 1.1,
        },
      }));

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      silenceAllErrorLogs();

      // Confirm the secondary video player rate is reduced after re-syncing
      await waitForExpect(() => {
        expect(mocks.setSecondaryRate).toHaveBeenCalledWith(1);
      });
    });

    it("delays the secondary video player when the primary player is behind to allow it to catch up", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      mocks.getStatus.mockImplementation(async () => ({
        primaryStatus: { positionMillis: 0, durationMillis: 1000, rate: 1 },
        secondaryStatus: {
          positionMillis: MAX_IN_SYNC_MILLISECOND_DIFFERENCE + 1,
          durationMillis: 1000,
          rate: 1,
        },
      }));

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      silenceAllErrorLogs();

      // Confirm the secondary video player is delayed
      await waitForExpect(() => {
        expect(mocks.pauseSecondary).toHaveBeenCalled();
      });
    });

    it("updates the position to resync the videos when the primary video is ahead of the secondary by 100 milliseconds", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const primaryVideoPosition =
        EXTREME_OUT_OF_SYNC_MILLISECOND_DIFFERENCE + 1;

      mocks.getStatus.mockImplementation(async () => ({
        primaryStatus: {
          positionMillis: primaryVideoPosition,
          durationMillis: 1000,
          rate: 1,
        },
        secondaryStatus: { positionMillis: 0, durationMillis: 1000, rate: 1 },
      }));

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      silenceAllErrorLogs();

      // Confirm the positions are updated to match the primary players
      await waitForExpect(() => {
        expect(mocks.setPosition).toHaveBeenCalledWith(primaryVideoPosition);
      });
    });

    it("updates the position to resync the videos when the secondary video is ahead of the primary by 100 milliseconds", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const primaryVideoPosition = 0;

      mocks.getStatus.mockImplementation(async () => ({
        primaryStatus: {
          positionMillis: primaryVideoPosition,
          durationMillis: 1000,
          rate: 1,
        },
        secondaryStatus: {
          positionMillis: EXTREME_OUT_OF_SYNC_MILLISECOND_DIFFERENCE + 1,
          durationMillis: 1000,
          rate: 1,
        },
      }));

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      silenceAllErrorLogs();

      // Confirm the positions are updated to match the primary players
      await waitForExpect(() => {
        expect(mocks.setPosition).toHaveBeenCalledWith(primaryVideoPosition);
      });
    });

    it("does not attempt to resync the video players when the player positions are close", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      mocks.getStatus.mockImplementation(async () => ({
        primaryStatus: { positionMillis: 0, durationMillis: 1000, rate: 1 },
        secondaryStatus: {
          positionMillis: MAX_IN_SYNC_MILLISECOND_DIFFERENCE,
          durationMillis: 1000,
          rate: 1,
        },
      }));

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      silenceAllErrorLogs();

      // give the re-syncing functions a chance to be called if they were to be
      await delay(2_000);

      // Does not delay the secondary video to allow the first to catch up
      expect(mocks.pauseSecondary).not.toHaveBeenCalledWith(25);

      // Does not increase the rate of the
      expect(mocks.pauseSecondary).not.toHaveBeenCalledWith(25);
    });
  });

  describe("Skipping forwards and back with side buttons", () => {
    it("can use the side bar buttons to move forward and back by ten seconds", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      // This status should never actually happen
      // Fake status to stop position from being updated by time passing
      // This ensures the sidebar buttons are what is controlling the current position
      mocks.getStatus.mockResolvedValue({
        primaryStatus: {
          durationMillis: 100_000,
        },
        secondaryStatus: {},
      });

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      const lowerControlBar = screen.getByTestId("lowerControlBar");

      silenceAllErrorLogs();

      // Confirm the start position is 0
      expect(within(lowerControlBar).getByTestId("timeBar").props.value).toBe(
        0
      );

      // Move the position forward by 10 seconds
      const forwardSidebarButton = getButtonByChildTestId(
        within(screen.getByTestId("sidebarRight")),
        "forward10Icon"
      );
      await asyncPressEvent(forwardSidebarButton);

      await waitForExpect(async () => {
        expect(mocks.setPosition).toHaveBeenCalledWith(10_000);
        expect(within(lowerControlBar).getByTestId("timeBar").props.value).toBe(
          10_000
        );
        expect(within(lowerControlBar).getByText("00:10")).toBeTruthy();
      });

      // Move the position back by 10 seconds
      const replaySidebarButton = getButtonByChildTestId(
        within(screen.getByTestId("sidebarLeft")),
        "replay10Icon"
      );
      await asyncPressEvent(replaySidebarButton);
      await waitForExpect(async () => {
        expect(mocks.setPosition).toHaveBeenCalledWith(0);
        expect(within(lowerControlBar).getByTestId("timeBar").props.value).toBe(
          0
        );
        expect(within(lowerControlBar).getByText("00:00")).toBeTruthy();
      });
    }, 10_000);

    it("starts playing the video again when using the side bar forward button and the video was playing", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      // This status should never actually happen
      // Fake status to stop position from being updated by time passing
      // This ensures the sidebar buttons are what is controlling the current position
      mocks.getStatus.mockResolvedValue({
        primaryStatus: {
          durationMillis: 100_000,
        },
        secondaryStatus: {},
      });

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      mocks.play.mockClear();

      const lowerControlBar = screen.getByTestId("lowerControlBar");

      silenceAllErrorLogs();

      // Move the position forward by 10 seconds
      const forwardSidebarButton = getButtonByChildTestId(
        within(screen.getByTestId("sidebarRight")),
        "forward10Icon"
      );
      await asyncPressEvent(forwardSidebarButton);

      await waitForExpect(async () =>
        expect(within(lowerControlBar).getByText("00:10")).toBeTruthy()
      );

      // Confirm the video starts playing again
      await waitForExpect(async () => {
        expect(mocks.setPosition).toHaveBeenCalledTimes(1);
        expect(mocks.play).toHaveBeenCalledTimes(1);
      });
    });

    it("starts playing the video again when using the side bar replay button and the video was playing", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      // This status should never actually happen
      // Fake status to stop position from being updated by time passing
      // This ensures the sidebar buttons are what is controlling the current position
      mocks.getStatus.mockResolvedValue({
        primaryStatus: {
          durationMillis: 100_000,
        },
        secondaryStatus: {},
      });

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      mocks.play.mockClear();

      const lowerControlBar = screen.getByTestId("lowerControlBar");

      silenceAllErrorLogs();

      // Move the position back by 10 seconds
      const replaySidebarButton = getButtonByChildTestId(
        within(screen.getByTestId("sidebarLeft")),
        "replay10Icon"
      );
      await asyncPressEvent(replaySidebarButton);

      await waitForExpect(async () =>
        expect(within(lowerControlBar).getByText("00:00")).toBeTruthy()
      );

      // Confirm the video starts playing again
      await waitForExpect(async () => {
        expect(mocks.setPosition).toHaveBeenCalledTimes(1);
        expect(mocks.play).toHaveBeenCalledTimes(1);
      });
    });

    it("does not start playing the video again when using the side bar forward button and the video was paused", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      // This status should never actually happen
      // Fake status to stop position from being updated by time passing
      // This ensures the sidebar buttons are what is controlling the current position
      mocks.getStatus.mockResolvedValue({
        primaryStatus: {
          durationMillis: 100_000,
        },
        secondaryStatus: {},
      });
      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // Pause the video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "pauseIcon"
        )
      );

      mocks.play.mockClear();

      const lowerControlBar = screen.getByTestId("lowerControlBar");

      silenceAllErrorLogs();

      // Move the position forward by 10 seconds
      const forwardSidebarButton = getButtonByChildTestId(
        within(screen.getByTestId("sidebarRight")),
        "forward10Icon"
      );
      await asyncPressEvent(forwardSidebarButton);

      await waitForExpect(async () =>
        expect(within(lowerControlBar).getByText("00:10")).toBeTruthy()
      );

      // Confirm the video does not start playing again
      await waitForExpect(async () => {
        expect(mocks.setPosition).toHaveBeenCalledTimes(1);
        expect(mocks.play).not.toHaveBeenCalled();
      });
    });

    it("does not start playing the video again when using the side bar replay button if the video was paused", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      // This status should never actually happen
      // Fake status to stop position from being updated by time passing
      // This ensures the sidebar buttons are what is controlling the current position
      mocks.getStatus.mockResolvedValue({
        primaryStatus: {
          durationMillis: 100_000,
        },
        secondaryStatus: {},
      });

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // Pause the video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("lowerControlBar")),
          "pauseIcon"
        )
      );

      mocks.play.mockClear();

      const lowerControlBar = screen.getByTestId("lowerControlBar");

      silenceAllErrorLogs();

      // Move the position back by 10 seconds
      const replaySidebarButton = getButtonByChildTestId(
        within(screen.getByTestId("sidebarLeft")),
        "replay10Icon"
      );
      await asyncPressEvent(replaySidebarButton);

      await waitForExpect(async () =>
        expect(within(lowerControlBar).getByText("00:00")).toBeTruthy()
      );

      // Confirm the video does not start playing again
      await waitForExpect(async () => {
        expect(mocks.setPosition).toHaveBeenCalledTimes(1);
        expect(mocks.play).not.toHaveBeenCalled();
      });
    });

    it("can not set a position less than 0", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      // This status should never actually happen
      // Fake status to stop position from being updated by time passing
      // This ensures the sidebar buttons are what is controlling the current position
      mocks.getStatus.mockResolvedValue({
        primaryStatus: {
          durationMillis: 100_000,
        },
        secondaryStatus: {},
      });

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      const lowerControlBar = screen.getByTestId("lowerControlBar");

      silenceAllErrorLogs();

      // Confirm the start position is 0
      expect(within(lowerControlBar).getByTestId("timeBar").props.value).toBe(
        0
      );

      // Move the position back by 10 seconds
      const replaySidebarButton = getButtonByChildTestId(
        within(screen.getByTestId("sidebarLeft")),
        "replay10Icon"
      );
      await asyncPressEvent(replaySidebarButton);

      await waitForExpect(async () => {
        expect(mocks.setPosition).toHaveBeenCalledTimes(1);
        expect(mocks.setPosition).toHaveBeenCalledWith(0);
      });
    });

    it("can not set a position greater than the videos duration", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      // This status should never actually happen
      // Fake status to stop position from being updated by time passing
      // This ensures the sidebar buttons are what is controlling the current position
      mocks.getStatus.mockResolvedValue({
        primaryStatus: {
          durationMillis: 5_000,
        },
        secondaryStatus: {},
      });

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      const lowerControlBar = screen.getByTestId("lowerControlBar");

      silenceAllErrorLogs();

      // Confirm the start position is 0
      expect(within(lowerControlBar).getByTestId("timeBar").props.value).toBe(
        0
      );

      // Move the position forward by 10 seconds
      const forwardSidebarButton = getButtonByChildTestId(
        within(screen.getByTestId("sidebarRight")),
        "forward10Icon"
      );
      await asyncPressEvent(forwardSidebarButton);

      await waitForExpect(async () => {
        expect(mocks.setPosition).toHaveBeenCalledTimes(1);
        expect(mocks.setPosition).toHaveBeenCalledWith(5_000);
      });
    });
  });

  describe("viewing the disable ads view", () => {
    it("can go to the disable ads page", async () => {
      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);

      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      const disableAsRewardButton = getButtonByText(
        within(screen.getByTestId("disableAdsView")),
        "Watch a short ad and disable all other ads for 20 minutes"
      );
      expect(disableAsRewardButton).toBeTruthy();

      const buyTheAppButton = getButtonByText(
        within(screen.getByTestId("disableAdsView")),
        "Buy the ad-free version of the app"
      );
      expect(buyTheAppButton).toBeTruthy();
    });

    it("shows a different message on the disable ads button when ads are already disabled", async () => {
      mockAdsAreDisabled();

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      await asyncPressEvent(disableAdsButton);

      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      const disableAsRewardButton = getButtonByText(
        within(screen.getByTestId("disableAdsView")),
        "Ads are already disabled. Add more time by watching another short ad"
      );
      expect(disableAsRewardButton).toBeTruthy();
    });

    it("shows a message about how long ads are disabled for when they are disabled", async () => {
      mockAdsAreDisabled();

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      await asyncPressEvent(disableAdsButton);

      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      expect(
        within(screen.getByTestId("disableAdsView")).getByText(
          /^Ads are disabled for \d\d:\d\d$/
        )
      ).toBeTruthy();
    });

    it("Shows the expected icons on the upper control bar while on the 'disable ads' view", async () => {
      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);

      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      // Confirm the expected icons on on the upper control bar
      expect(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      ).toBeTruthy();
      expect(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      ).toBeTruthy();

      expect(
        within(screen.getByTestId("upperControlBar")).getAllByRole("button")
      ).toHaveLength(2);
    });

    it("Disables all lower bar controls while on the disable ads view", async () => {
      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      // Confirm the view we are on
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      // Confirm all buttons are disabled
      const lowerControlBar = screen.getByTestId("lowerControlBar");
      expect(lowerControlBar).toBeTruthy();

      const playButton = getButtonByChildTestId(
        within(lowerControlBar),
        "playIcon"
      );

      expect(buttonProps(playButton).disabled).toBeTruthy();

      const playerTypeButton = getButtonByChildTestId(
        within(lowerControlBar),
        "screenDesktopIcon"
      );
      expect(buttonProps(playerTypeButton).disabled).toBeTruthy();

      const screenStretchButton = getButtonByChildTestId(
        within(lowerControlBar),
        "screenNormalIcon"
      );
      expect(buttonProps(screenStretchButton).disabled).toBeTruthy();

      const timeBar = within(lowerControlBar).getByTestId("timeBar");
      expect(timeBar.props.disabled).toBeTruthy();
    });

    it("Disables all side bar controls while on the disable ads view", async () => {
      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      // Confirm the view we are on
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      // Confirm buttons are disabled
      const sideBarLeft = screen.getByTestId("sidebarLeft");
      expect(sideBarLeft).toBeTruthy();

      const replaySidebarButton = getButtonByChildTestId(
        within(sideBarLeft),
        "replay10Icon"
      );
      expect(buttonProps(replaySidebarButton).disabled).toBeTruthy();

      const sideBarRight = screen.getByTestId("sidebarRight");
      expect(sideBarRight).toBeTruthy();
      const forwardSidebarButton = getButtonByChildTestId(
        within(sideBarRight),
        "forward10Icon"
      );
      expect(buttonProps(forwardSidebarButton).disabled).toBeTruthy();
    });

    it("Shows a banner ad on the disable ads view", async () => {
      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);

      // Confirm the current view
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      // Check ad banner is visible
      expect(screen.queryByTestId("bannerAd")).toBeTruthy();
    });

    it("Hide the banner ad on the home view if ads are disabled", async () => {
      mockAdsAreDisabled();

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);

      // Confirm the current view
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      // Check ad banner is not visible
      expect(screen.queryByTestId("bannerAd")).not.toBeTruthy();
    });

    it("returns to the home view when the back button is pressed after viewing the disable ads view", async () => {
      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      // Confirm the view we are on
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

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

    it("returns to the home view when the hardware back button is pressed after viewing the disable ads view", async () => {
      const screen = await asyncRender(<App />);
      const getMockBackHandlerCallback = mockBackHandlerCallback();

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      // Confirm the view we are on
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      // fire the event for the hardware back button
      const backHandlerCallback = getMockBackHandlerCallback();
      await act(async () => backHandlerCallback());

      // confirm the home view is now visible
      expect(screen.getByTestId("homeView")).toBeTruthy();
    });
  });

  describe("Can disable ads", () => {
    it("Sets the reward ad unit id on mount", async () => {
      const mockRewardAds = mockAdMobRewarded();

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      expect(mockRewardAds.setAdUnitID).toHaveBeenCalledTimes(1);
    });

    it("loads and shows the reward ad when the disable button is pressed", async () => {
      const mockRewardAds = mockAdMobRewarded();

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("disableAdsView")),
          "Watch a short ad and disable all other ads for 20 minutes"
        )
      );

      // Reward ad is loaded and displayed
      expect(mockRewardAds.getIsReadyAsync).toHaveBeenCalledTimes(1);
      expect(mockRewardAds.requestAdAsync).toHaveBeenCalledTimes(1);
      expect(mockRewardAds.showAdAsync).toHaveBeenCalledTimes(1);
    });

    it("shows the reward ad without loading if an ad is ready to show", async () => {
      const mockRewardAds = mockAdMobRewarded();

      mockRewardAds.getIsReadyAsync.mockResolvedValue(true);

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("disableAdsView")),
          "Watch a short ad and disable all other ads for 20 minutes"
        )
      );

      // Reward ad is displayed but loading is not required
      expect(mockRewardAds.getIsReadyAsync).toHaveBeenCalledTimes(1);
      expect(mockRewardAds.requestAdAsync).not.toHaveBeenCalled();
      expect(mockRewardAds.showAdAsync).toHaveBeenCalledTimes(1);
    });

    it("Stops showing the banner ad after ads are disabled", async () => {
      const mockRewardAds = mockAdMobRewarded();

      jest.spyOn(asyncStorage.adsDisabledTime, "save");

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("disableAdsView")),
          "Watch a short ad and disable all other ads for 20 minutes"
        )
      );

      // Earn the reward
      const earnRewardCallback = mockRewardAds.getEarnRewardCallback();
      await act(async () => earnRewardCallback());

      // Check the disable message is shown
      expect(
        within(screen.getByTestId("disableAdsView")).queryByTestId("bannerAd")
      ).not.toBeTruthy();
    });

    it("Stops showing the banner ad after ads are disabled", async () => {
      const mockRewardAds = mockAdMobRewarded();

      jest.spyOn(asyncStorage.adsDisabledTime, "save");

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      // confirm the ad banner is visible before disabling ads
      expect(screen.getByTestId("bannerAd")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("disableAdsView")),
          "Watch a short ad and disable all other ads for 20 minutes"
        )
      );

      // Earn the reward
      const earnRewardCallback = mockRewardAds.getEarnRewardCallback();
      await act(async () => earnRewardCallback());

      // Check ad banner is not visible
      expect(screen.queryByTestId("bannerAd")).not.toBeTruthy();
    });

    it("shows an error alert if the reward ad fails to load", async () => {
      const mockRewardAds = mockAdMobRewarded();

      // Errors when an ad is loaded
      mockRewardAds.requestAdAsync.mockRejectedValue("error requesting ad");

      jest.spyOn(Alert, "alert");

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("disableAdsView")),
          "Watch a short ad and disable all other ads for 20 minutes"
        )
      );

      // Confirm the ad does not show
      expect(mockRewardAds.showAdAsync).not.toHaveBeenCalled();

      // Confirm the error alert is shown
      expect(Alert.alert).toHaveBeenCalledTimes(1);

      // Confirm alert message is correct
      expect(Alert.alert.mock.calls[0][0]).toBe("Unable to load advert");
      expect(Alert.alert.mock.calls[0][1]).toBe(
        `Sorry, we had trouble loading an advert to show.\n\nAll other ads will be disabled for 2 minutes.\n\nTry again later`
      );
    });

    it("shows an error alert if the reward ad fails to show", async () => {
      const mockRewardAds = mockAdMobRewarded();

      // Errors when an ad is loaded
      mockRewardAds.showAdAsync.mockRejectedValue("error showing ad");

      jest.spyOn(Alert, "alert");

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("disableAdsView")),
          "Watch a short ad and disable all other ads for 20 minutes"
        )
      );

      // Confirm the error alert is shown
      expect(Alert.alert).toHaveBeenCalledTimes(1);

      // Confirm alert message is correct
      expect(Alert.alert.mock.calls[0][0]).toBe("Unable to load advert");
      expect(Alert.alert.mock.calls[0][1]).toBe(
        `Sorry, we had trouble loading an advert to show.\n\nAll other ads will be disabled for 2 minutes.\n\nTry again later`
      );
    });

    it("disables ads for 2 minutes when the the reward ad error alert is dismissed", async () => {
      const mockRewardAds = mockAdMobRewarded();

      // Errors when an ad is loaded
      mockRewardAds.requestAdAsync.mockRejectedValue("error requesting ad");

      jest.spyOn(asyncStorage.adsDisabledTime, "save");
      jest.spyOn(Alert, "alert");

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("disableAdsView")),
          "Watch a short ad and disable all other ads for 20 minutes"
        )
      );

      // Confirm the ad does not show
      expect(mockRewardAds.showAdAsync).not.toHaveBeenCalled();

      // Confirm the error alert is shown
      expect(Alert.alert).toHaveBeenCalledTimes(1);

      // Fire the alerts dismiss callback
      const { onPress } = Alert.alert.mock.calls[0][2][0];
      await act(onPress);

      // Confirm ads were disabled for 2 minutes
      expect(asyncStorage.adsDisabledTime.save).toHaveBeenCalledTimes(1);
      expect(
        asyncStorage.adsDisabledTime.save.mock.calls[0][0].totalDisableTime
      ).toBe(2 * 60 * 1000); // two minutes
      expect(screen.queryByTestId("bannerAd")).toBeFalsy();
    });

    it("shows an error alert with a different message when there is an issue showing a reward ad but ads are already disabled", async () => {
      const mockRewardAds = mockAdMobRewarded();

      // Errors when an ad is loaded
      mockRewardAds.requestAdAsync.mockRejectedValue("error requesting ad");

      mockAdsAreDisabled();
      jest.spyOn(asyncStorage.adsDisabledTime, "save");
      jest.spyOn(Alert, "alert");

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.getByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.getByTestId("disableAdsView")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("disableAdsView")),
          "Ads are already disabled. Add more time by watching another short ad"
        )
      );

      // Confirm the error alert is shown
      expect(Alert.alert).toHaveBeenCalledTimes(1);

      // Fire the alerts dismiss callback
      const { onPress } = Alert.alert.mock.calls[0][2][0];
      await act(onPress);

      // Confirm alert message is correct
      expect(Alert.alert.mock.calls[0][0]).toBe("Unable to load advert");
      expect(Alert.alert.mock.calls[0][1]).toBe(
        `Sorry, we had trouble loading an advert to show.\n\nAds are already disabled but more time can be added next time an advert can be shown.\n\nTry again later`
      );
    });
  });
});

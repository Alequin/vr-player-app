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
  openURL: jest.fn(),
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwake: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}));

import { act, cleanup, within } from "@testing-library/react-native";
import { AdMobInterstitial } from "expo-ads-admob";
import * as Linking from "expo-linking";
import * as MediaLibrary from "expo-media-library";
import { last } from "lodash";
import React from "React";
import { Alert, ToastAndroid } from "react-native";
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
import { mockVideoThumbnails } from "./mocks/mock-video-thumbnails";
import { addMultipleVideosToAPlaylist } from "./scenarios/add-multiple-videos-to-a-playlist";
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
import { activateKeepAwake, deactivateKeepAwake } from "expo-keep-awake";

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
    jest
      .spyOn(
        hasEnoughTimePastToShowInterstitialAd,
        "hasEnoughTimePastToShowInterstitialAd"
      )
      .mockRestore();

    mockMediaLibrary.grantedPermission();
    jest.spyOn(ToastAndroid, "show").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    enableAllErrorLogs();
  });

  describe("Requesting permission to access media files", () => {
    it("Checks if the user has given permission to use the media library and requests they give permission if they have not", async () => {
      const { mockRequestPermissionsAsync } =
        mockMediaLibrary.undeterminedPermissions();

      const screen = await asyncRender(<App />);

      // Confirm permissions have been requested from the user
      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);

      // Confirm a button is shown asking the user to give permission
      const permissionsButton = getButtonByText(
        screen,
        `You will need to grant the app permission to view media files\n\nbefore you can select videos to watch.`
      );

      expect(permissionsButton).toBeTruthy();
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
      const { mockRequestPermissionsAsync } =
        mockMediaLibrary.rejectedPermissions();

      const screen = await asyncRender(<App />);

      // Confirm permissions have been requested from the user
      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);

      // Confirm a button is shown asking the user to give permission
      const permissionsButton = getButtonByText(
        screen,
        `You will need to grant the app permission to view media files\n\nbefore you can select videos to watch.`
      );

      expect(permissionsButton).toBeTruthy();
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
      const { mockGetPermissionsAsync } =
        mockMediaLibrary.undeterminedPermissions();
      const updateAppState = mockAppState.mockAppStateUpdate();

      const screen = await asyncRender(<App />);

      // The permission status is checked initially
      expect(mockGetPermissionsAsync).toHaveBeenCalledTimes(1);

      // Confirm a button is shown asking the user to give permission
      const permissionsButton = getButtonByText(
        screen,
        `You will need to grant the app permission to view media files\n\nbefore you can select videos to watch.`
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

    it("Disables / hides all controls while on the 'request permissions' view", async () => {
      mockMediaLibrary.undeterminedPermissions();
      const screen = await asyncRender(<App />);

      // Confirm a button is shown asking the user to give permission
      expect(
        getButtonByText(
          screen,
          `You will need to grant the app permission to view media files\n\nbefore you can select videos to watch.`
        )
      ).toBeTruthy();

      // Confirm all buttons are disabled
      const lowerControlBar = screen.queryByTestId("lowerControlBar");
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

      const timeBar = within(lowerControlBar).queryByTestId("timeBar");
      expect(timeBar.props.disabled).toBeTruthy();

      // Confirm sidebar buttons are hidden
      const sideBarLeft = screen.queryByTestId("sidebarLeft");
      expect(sideBarLeft).toBe(null);

      const sideBarRight = screen.queryByTestId("sidebarRight");
      expect(sideBarRight).toBe(null);

      // Confirm upper control bar buttons are disables
      const upperControlBar = screen.queryByTestId("upperControlBar");
      expect(
        buttonProps(
          getButtonByChildTestId(within(upperControlBar), "iosArrowBackIcon")
        ).disabled
      ).toBeTruthy();

      expect(
        buttonProps(
          getButtonByChildTestId(within(upperControlBar), "folderVideoIcon")
        ).disabled
      ).toBeTruthy();
    });
  });

  describe("First opening the app", () => {
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
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );

      expect(loadViewButton).toBeTruthy();
      expect(
        within(loadViewButton).queryByTestId("folderVideoIcon")
      ).toBeTruthy();
    });

    it("Shows a button to view the disable ads view", async () => {
      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const disableAdsButton = getButtonByText(within(homeView), "Disable ads");

      expect(disableAdsButton).toBeTruthy();
      expect(within(disableAdsButton).queryByTestId("cancelIcon")).toBeTruthy();
    });

    it("Disables all lower bar controls while on the home page", async () => {
      const screen = await asyncRender(<App />);

      // Confirm the view we are on
      expect(screen.queryByTestId("homeView")).toBeTruthy();

      // Confirm all buttons are disabled
      const lowerControlBar = screen.queryByTestId("lowerControlBar");
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

      const timeBar = within(lowerControlBar).queryByTestId("timeBar");
      expect(timeBar.props.disabled).toBeTruthy();
    });

    it("Hides all side bar controls while on the home page", async () => {
      const screen = await asyncRender(<App />);

      // Confirm the view we are on
      expect(screen.queryByTestId("homeView")).toBeTruthy();

      // Confirm buttons are hidden
      const sideBarLeft = screen.queryByTestId("sidebarLeft");
      expect(sideBarLeft).toBe(null);

      const sideBarRight = screen.queryByTestId("sidebarRight");
      expect(sideBarRight).toBe(null);
    });

    it("Shows the expected icons on the upper control bar while on the home view", async () => {
      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      // Confirm the expected icons on on the upper control bar
      expect(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      ).toBeTruthy();
      expect(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      ).toBeTruthy();

      expect(
        within(screen.queryByTestId("upperControlBar")).getAllByRole("button")
      ).toHaveLength(2);
    });

    it("Disables the back button on the upper bar controls while on the home page", async () => {
      const screen = await asyncRender(<App />);

      // Confirm the view we are on
      expect(screen.queryByTestId("homeView")).toBeTruthy();

      const upperControlBar = screen.queryByTestId("upperControlBar");
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
          within(screen.queryByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      ).toBeTruthy();
    });

    it("Shows a banner ad on the home view", async () => {
      const screen = await asyncRender(<App />);

      // Confirm the current view
      expect(screen.queryByTestId("homeView"));

      // Check ad banner is visible
      expect(screen.queryByTestId("bannerAd")).toBeTruthy();
    });

    it("Hide the banner ad on the home view if ads are disabled", async () => {
      mockAdsAreDisabled();
      const screen = await asyncRender(<App />);

      // Confirm the current view
      expect(screen.queryByTestId("homeView"));

      // Check ad banner is not visible
      expect(screen.queryByTestId("bannerAd")).toBe(null);
    });
  });

  describe("Selecting a video", () => {
    it("Opens the 'select a video' view when the 'load a video' button is press on the 'home' view", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("file");

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();
    });

    it("Opens the 'select a video' view when the button on the upper control bar is pressed", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("file");

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      );

      // Confirm we are taken to the "select a video" page
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();
    });

    it("Opens the 'select a video' view and shows a loading indicator while loading the video file names", async (done) => {
      mockUseVideoPlayerRefs();
      const { mockGetAssetsAsync } = mockMediaLibrary.singleAsset("file");

      // Fake a delay in fetching the video file paths
      mockGetAssetsAsync.mockImplementation(async () => await delay(60_000));

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm the loading indicator on the 'select a video' view is shown
      expect(screen.queryByTestId("loadingIndicatorView")).toBeTruthy();

      done();
    });

    it("Shows a fake loading indicator on the 'select a video' view for a short time when no videos are found", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.multipleAssets([]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm the loading indicator on the 'select a video' view is shown
      expect(screen.queryByTestId("loadingIndicatorView")).toBeTruthy();

      // Confirm the loading indicator is replaced by the 'no video options' view
      silenceAllErrorLogs();
      expect(await screen.findByTestId("noVideoOptionsView")).toBeTruthy();
      enableAllErrorLogs();
      expect(screen.queryByTestId("loadingIndicatorView")).toBe(null);
    });

    it("Shows a list of videos to watch on the 'select a video' view", async () => {
      mockUseVideoPlayerRefs();

      const { mockGetAssetsAsync } = mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-short.mp4`,
          filename: `file-short.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01").getTime(),
        },
        {
          uri: `path/to/file-mid.mp4`,
          filename: `file-mid.mp4`,
          duration: 630, // 10 minutes 30 seconds
          modificationTime: new Date("2020-08-15").getTime(),
        },
        {
          uri: `path/to/file-long.mp4`,
          filename: `file-long.mp4`,
          duration: 7800, // 2 hours 10 minutes
          modificationTime: new Date("2020-07-23").getTime(),
        },
      ]);

      mockVideoThumbnails.ableToLoadThumbnails([
        {
          videoUri: `path/to/file-short.mp4`,
          thumbnailUri: `path/to/file-short-thumbnail.jpg`,
        },
        {
          videoUri: `path/to/file-mid.mp4`,
          thumbnailUri: `path/to/file-mid-thumbnail.jpg`,
        },
        {
          videoUri: `path/to/file-long.mp4`,
          thumbnailUri: `path/to/file-long-thumbnail.jpg`,
        },
      ]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      const selectVideoView = screen.queryByTestId("selectVideoListView");
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
      expect(within(shortVideoButton).queryByText("00:30")).toBeTruthy();
      expect(within(shortVideoButton).queryByText("Sept 1 2020")).toBeTruthy();
      const shortVideoThumbnail = within(selectVideoView).queryByTestId(
        "file-short.mp4Thumbnail"
      );
      expect(shortVideoThumbnail).toBeTruthy();
      expect(shortVideoThumbnail.props.source).toEqual({
        uri: `path/to/file-short-thumbnail.jpg`,
      });

      // Confirm the mid videos button is visible
      const midVideoButton = getButtonByText(
        within(selectVideoView),
        `file-mid.mp4`
      );

      expect(midVideoButton).toBeTruthy();
      expect(within(midVideoButton).queryByText("10:30")).toBeTruthy();
      expect(within(midVideoButton).queryByText("Aug 15 2020")).toBeTruthy();
      const midVideoThumbnail = within(selectVideoView).queryByTestId(
        "file-mid.mp4Thumbnail"
      );
      expect(midVideoThumbnail).toBeTruthy();
      expect(midVideoThumbnail.props.source).toEqual({
        uri: `path/to/file-mid-thumbnail.jpg`,
      });

      // Confirm the long videos button is visible
      const longVideoButton = getButtonByText(
        within(selectVideoView),
        `file-long.mp4`
      );

      expect(longVideoButton).toBeTruthy();
      expect(within(longVideoButton).queryByText("02:10:00")).toBeTruthy();
      expect(within(longVideoButton).queryByText("Jul 23 2020")).toBeTruthy();
      const longVideoThumbnail = within(selectVideoView).queryByTestId(
        "file-long.mp4Thumbnail"
      );
      expect(longVideoThumbnail).toBeTruthy();
      expect(longVideoThumbnail.props.source).toEqual({
        uri: `path/to/file-long-thumbnail.jpg`,
      });
    });

    it("Shows a list of videos with the default thumbnail when there are issues loading thumbnails on the 'select a video' view", async () => {
      mockUseVideoPlayerRefs();

      const { mockGetAssetsAsync } = mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-short.mp4`,
          filename: `file-short.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01").getTime(),
        },
      ]);

      mockVideoThumbnails.failToLoadThumbnails();

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      const selectVideoView = screen.queryByTestId("selectVideoListView");
      expect(selectVideoView).toBeTruthy();

      // Confirm the video files are requested
      expect(mockGetAssetsAsync).toHaveBeenCalledTimes(1);
      expect(mockGetAssetsAsync).toHaveBeenCalledWith({
        mediaType: MediaLibrary.MediaType.video,
        first: 100000,
      });

      // Confirm the short videos button is visible with the default icon
      const shortVideoButton = getButtonByText(
        within(selectVideoView),
        `file-short.mp4`
      );

      expect(shortVideoButton).toBeTruthy();
      expect(within(selectVideoView).queryByTestId("videoIcon")).toBeTruthy();
    });

    it("Shows the 'no video options' view when there are no videos on the device", async () => {
      mockUseVideoPlayerRefs();

      mockMediaLibrary.multipleAssets([]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the 'no video options' page
      silenceAllErrorLogs();
      const noVideoOptionsView = await screen.findByTestId(
        "noVideoOptionsView"
      );
      enableAllErrorLogs();
      expect(noVideoOptionsView).toBeTruthy();

      const reloadVideosButton = getButtonByText(
        within(noVideoOptionsView),
        "Cannot find any videos to play.\n\nMove some onto your device to watch them in VR."
      );

      expect(reloadVideosButton).toBeTruthy();
      expect(
        within(reloadVideosButton).queryByTestId("refreshIcon")
      ).toBeTruthy();
      expect(
        within(reloadVideosButton).queryByText("Reload video files")
      ).toBeTruthy();
    });

    it("Reloads the video options when the button on the 'no video options' view is pressed", async () => {
      mockUseVideoPlayerRefs();

      mockMediaLibrary.multipleAssets([]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the 'no video options' page
      silenceAllErrorLogs();
      const noVideoOptionsView = await screen.findByTestId(
        "noVideoOptionsView"
      );
      enableAllErrorLogs();
      expect(noVideoOptionsView).toBeTruthy();

      const reloadVideosButton = getButtonByText(
        within(noVideoOptionsView),
        "Cannot find any videos to play.\n\nMove some onto your device to watch them in VR."
      );

      expect(reloadVideosButton).toBeTruthy();
      expect(
        within(reloadVideosButton).queryByTestId("refreshIcon")
      ).toBeTruthy();
      expect(
        within(reloadVideosButton).queryByText("Reload video files")
      ).toBeTruthy();

      // Update the options returned on request
      mockMediaLibrary.singleAsset("path/to/file.mp4");
      // Press the button to reload the video options
      await asyncPressEvent(reloadVideosButton);

      // Confirm the video option button is now visible
      expect(
        getButtonByText(
          within(screen.queryByTestId("selectVideoListView")),
          "path/to/file.mp4"
        )
      ).toBeTruthy();
    });

    it("Shows an error page with a reload button when the video options fail to load", async () => {
      mockUseVideoPlayerRefs();

      mockMediaLibrary.failToLoadAssets();

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "error loading video options" View
      silenceAllErrorLogs();
      const errorLoadingOptionsView = await screen.findByTestId(
        "errorLoadingVideoOptionsView"
      );
      enableAllErrorLogs();
      expect(errorLoadingOptionsView).toBeTruthy();

      const reloadVideosButton = getButtonByText(
        within(errorLoadingOptionsView),
        "Sorry, there was an issue while looking for videos to play.\n\nReload to try again."
      );

      expect(reloadVideosButton).toBeTruthy();
      expect(
        within(reloadVideosButton).queryByTestId("refreshIcon")
      ).toBeTruthy();
      expect(
        within(reloadVideosButton).queryByText("Reload video files")
      ).toBeTruthy();
    });

    it("Reloads the video options when the button on the 'error loading video options' view is pressed", async () => {
      mockUseVideoPlayerRefs();

      mockMediaLibrary.failToLoadAssets();

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "error loading video options" View
      silenceAllErrorLogs();
      const errorLoadingOptionsView = await screen.findByTestId(
        "errorLoadingVideoOptionsView"
      );
      enableAllErrorLogs();
      expect(errorLoadingOptionsView).toBeTruthy();

      const reloadVideosButton = getButtonByText(
        within(errorLoadingOptionsView),
        "Sorry, there was an issue while looking for videos to play.\n\nReload to try again."
      );
      expect(reloadVideosButton).toBeTruthy();

      // Update the options returned on request without error
      mockMediaLibrary.singleAsset("path/to/file.mp4");
      // Press the button to reload the video options
      await asyncPressEvent(reloadVideosButton);

      // Confirm the video option button is now visible
      expect(
        getButtonByText(
          within(screen.queryByTestId("selectVideoListView")),
          "path/to/file.mp4"
        )
      ).toBeTruthy();
    });

    it("Shows the expected icons on the upper control bar while on the 'select a video' view", async () => {
      mockMediaLibrary.singleAsset("file");

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

      // Confirm the expected icons on on the upper control bar
      expect(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      ).toBeTruthy();
      expect(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "sortAmountAscIcon"
        )
      ).toBeTruthy();
      expect(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "playlistAddIcon"
        )
      ).toBeTruthy();
      expect(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "refreshIcon"
        )
      ).toBeTruthy();

      expect(
        within(screen.queryByTestId("upperControlBar")).getAllByRole("button")
      ).toHaveLength(4);
    });

    it("Disables the expected upper control bar buttons while on the 'no video options' view", async () => {
      mockUseVideoPlayerRefs();

      mockMediaLibrary.multipleAssets([]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the 'no video options' page
      silenceAllErrorLogs();
      const noVideoOptionsView = await screen.findByTestId(
        "noVideoOptionsView"
      );
      enableAllErrorLogs();
      expect(noVideoOptionsView).toBeTruthy();

      const upperControlBar = screen.queryByTestId("upperControlBar");
      expect(
        buttonProps(
          getButtonByChildTestId(within(upperControlBar), "iosArrowBackIcon")
        ).disabled
      ).toBe(false);
      expect(
        buttonProps(
          getButtonByChildTestId(within(upperControlBar), "sortAmountAscIcon")
        ).disabled
      ).toBe(true);
      expect(
        buttonProps(
          getButtonByChildTestId(within(upperControlBar), "playlistAddIcon")
        ).disabled
      ).toBe(true);
      expect(
        buttonProps(
          getButtonByChildTestId(within(upperControlBar), "refreshIcon")
        ).disabled
      ).toBe(false);
    });

    it("Disables all lower bar controls while on the select a video view", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("file");

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

      // Confirm all buttons are disabled
      const lowerControlBar = screen.queryByTestId("lowerControlBar");
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

      const timeBar = within(lowerControlBar).queryByTestId("timeBar");
      expect(timeBar.props.disabled).toBeTruthy();
    });

    it("Hides all side bar controls while on the select a video view", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("file");

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

      // Confirm buttons are hidden
      const sideBarLeft = screen.queryByTestId("sidebarLeft");
      expect(sideBarLeft).toBe(null);

      const sideBarRight = screen.queryByTestId("sidebarRight");
      expect(sideBarRight).toBe(null);
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
          const homeView = screen.queryByTestId("homeView");
          expect(homeView).toBeTruthy();

          const loadViewButton = getButtonByText(
            within(homeView),
            "Select a video to watch"
          );
          expect(loadViewButton).toBeTruthy();

          // Press button to pick a video
          await asyncPressEvent(loadViewButton);

          // Confirm we are taken to the "select a video" page
          const selectVideoView = screen.queryByTestId("selectVideoListView");
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
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      const selectVideoView = screen.queryByTestId("selectVideoListView");
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
      const homeView = screen.queryByTestId("homeView");
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
      const homeView = screen.queryByTestId("homeView");
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
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      // Play the video and confirm the correct functions are called
      const loadViewButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeDefined();

      // Press button to load video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

      // Select the first video option
      await asyncPressEvent(
        getButtonByText(
          within(screen.queryByTestId("selectVideoListView")),
          "path/to/file#1.mp4"
        )
      );

      expect(mocks.load).toHaveBeenCalledWith(
        {
          filename: "path/to/file#1.mp4",
          uri: "path/to/file%231.mp4",
          duration: 10000,
          filename: "path/to/file#1.mp4",
          modificationTime: 1609459200000,
        },
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
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

      // Confirm permissions where checked
      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);

      // Confirm a video button is shown
      expect(
        getButtonByText(
          within(screen.queryByTestId("selectVideoListView")),
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
          modificationTime: new Date("2020-08-15").getTime(),
        },
        {
          uri: `path/to/file-newest.mp4`,
          filename: `file-newest.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01").getTime(),
        },

        {
          uri: `path/to/file-oldest.mp4`,
          filename: `file-oldest.mp4`,
          duration: 630,
          modificationTime: new Date("2020-07-23").getTime(),
        },
      ]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      const selectVideoView = screen.queryByTestId("selectVideoListView");
      expect(selectVideoView).toBeTruthy();

      // Confirm the sort button is available and defaults to "Newest to oldest"
      expect(
        getButtonByText(
          within(screen.queryByTestId("upperControlBar")),
          "Newest to oldest"
        )
      ).toBeTruthy();

      // Confirm the initial order is "Newest to oldest"
      const sortedByNewestToOldest = within(
        screen.queryByTestId("selectVideoListView")
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
          within(screen.queryByTestId("upperControlBar")),
          "Newest to oldest"
        )
      );
      expect(
        getButtonByText(
          within(screen.queryByTestId("upperControlBar")),
          "Oldest to newest"
        )
      ).toBeTruthy();

      // Confirm the new order is "Oldest to newest"
      const sortedByOldestToNewest = within(
        screen.queryByTestId("selectVideoListView")
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
          within(screen.queryByTestId("upperControlBar")),
          "Oldest to newest"
        )
      );
      expect(
        getButtonByText(
          within(screen.queryByTestId("upperControlBar")),
          "A to Z"
        )
      ).toBeTruthy();

      // Confirm the new order is "A to Z"
      const sortedByAToZ = within(
        screen.queryByTestId("selectVideoListView")
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
        getButtonByText(
          within(screen.queryByTestId("upperControlBar")),
          "A to Z"
        )
      );
      expect(
        getButtonByText(
          within(screen.queryByTestId("upperControlBar")),
          "Z to A"
        )
      ).toBeTruthy();

      // Confirm the new order is "Z to A"
      const sortedByZToA = within(
        screen.queryByTestId("selectVideoListView")
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
        getButtonByText(
          within(screen.queryByTestId("upperControlBar")),
          "Z to A"
        )
      );
      expect(
        getButtonByText(
          within(screen.queryByTestId("upperControlBar")),
          "Longest to shortest"
        )
      ).toBeTruthy();

      // Confirm the new order is "Longest to shortest"
      const sortedByLongestToShortest = within(
        screen.queryByTestId("selectVideoListView")
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
          within(screen.queryByTestId("upperControlBar")),
          "Longest to shortest"
        )
      );
      expect(
        getButtonByText(
          within(screen.queryByTestId("upperControlBar")),
          "Shortest to longest"
        )
      ).toBeTruthy();

      // Confirm the new order is "Shortest to longest"
      const sortedByShortestToLongest = within(
        screen.queryByTestId("selectVideoListView")
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
          within(screen.queryByTestId("upperControlBar")),
          "Shortest to longest"
        )
      );
      expect(
        getButtonByText(
          within(screen.queryByTestId("upperControlBar")),
          "Newest to oldest"
        )
      ).toBeTruthy();

      // Confirm the new order is "Newest to oldest"
      const sortedByNewestToOldestAgain = within(
        screen.queryByTestId("selectVideoListView")
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
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      const selectVideoView = screen.queryByTestId("selectVideoListView");
      expect(selectVideoView).toBeTruthy();

      // Confirm the sort order was loaded
      expect(asyncStorage.videoSortOrder.load).toHaveBeenCalledTimes(1);

      // Confirm the sort button is available and defaults to the saved sort order
      expect(
        getButtonByText(
          within(screen.queryByTestId("upperControlBar")),
          "Z to A"
        )
      ).toBeTruthy();

      // Update the sort order
      await asyncPressEvent(
        getButtonByText(
          within(screen.queryByTestId("upperControlBar")),
          "Z to A"
        )
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
            modificationTime: new Date("2020-09-01").getTime(),
          },
          {
            uri: `path/to/file-mid.mp4`,
            filename: `file-mid.mp4`,
            duration: 630, // 10 minutes 30 seconds
            modificationTime: new Date("2020-08-15").getTime(),
          },
          {
            uri: `path/to/file-long.mp4`,
            filename: `file-long.mp4`,
            duration: 7800, // 2 hours 10 minutes
            modificationTime: new Date("2020-07-23").getTime(),
          },
        ]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

      // Confirm the video files are requested
      expect(firstMockGetAssetsAsync).toHaveBeenCalledTimes(1);

      // Confirm the expected video options are visible
      expect(
        getButtonByText(
          within(screen.queryByTestId("selectVideoListView")),
          `file-short.mp4`
        )
      ).toBeTruthy();
      expect(
        getButtonByText(
          within(screen.queryByTestId("selectVideoListView")),
          `file-mid.mp4`
        )
      ).toBeTruthy();
      expect(
        getButtonByText(
          within(screen.queryByTestId("selectVideoListView")),
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
            modificationTime: new Date("2020-09-01").getTime(),
          },
          {
            uri: `path/to/new-file-mid.mp4`,
            filename: `new-file-mid.mp4`,
            duration: 630, // 10 minutes 30 seconds
            modificationTime: new Date("2020-08-15").getTime(),
          },
          {
            uri: `path/to/new-file-long.mp4`,
            filename: `new-file-long.mp4`,
            duration: 7800, // 2 hours 10 minutes
            modificationTime: new Date("2020-07-23").getTime(),
          },
        ]);

      // Reload the video options
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "refreshIcon"
        )
      );

      // Confirm the video files are requested again
      expect(secondMockGetAssetsAsync).toHaveBeenCalledTimes(2);

      // Confirm the video options have updated
      expect(
        getButtonByText(
          within(screen.queryByTestId("selectVideoListView")),
          `new-file-short.mp4`
        )
      ).toBeTruthy();
      expect(
        getButtonByText(
          within(screen.queryByTestId("selectVideoListView")),
          `new-file-mid.mp4`
        )
      ).toBeTruthy();
      expect(
        getButtonByText(
          within(screen.queryByTestId("selectVideoListView")),
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
      const homeView = screen.queryByTestId("homeView");
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
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

      // Select the first video option
      await asyncPressEvent(
        getButtonByText(
          within(screen.queryByTestId("selectVideoListView")),
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
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

      // Select the first video option
      await asyncPressEvent(
        getButtonByText(
          within(screen.queryByTestId("selectVideoListView")),
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
      const homeView = screen.queryByTestId("homeView");
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

      it("allows the video to play when there is no interstitial ad to show", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { getIsReadyAsync } = mockAdMobInterstitial();
        mockMediaLibrary.singleAsset("path/to/file.mp4");

        const screen = await asyncRender(<App />);
        const homeView = screen.queryByTestId("homeView");
        expect(homeView).toBeTruthy();

        // Fake that the ad is not ready to show
        getIsReadyAsync.mockReturnValue(false);

        // Play the video and confirm the correct functions are called
        await startWatchingVideoFromHomeView({
          screen,
          videoPlayerMocks: mocks,
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
        const homeView = screen.queryByTestId("homeView");
        expect(homeView).toBeTruthy();

        // No error initially
        expect(logError).not.toHaveBeenCalled();

        await startWatchingVideoFromHomeView({
          screen,
          videoPlayerMocks: mocks,
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
        const homeView = screen.queryByTestId("homeView");
        expect(homeView).toBeTruthy();

        // No error initially
        expect(logError).not.toHaveBeenCalled();

        await startWatchingVideoFromHomeView({
          screen,
          videoPlayerMocks: mocks,
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
        const homeView = screen.queryByTestId("homeView");
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
            within(screen.queryByTestId("upperControlBar")),
            "iosArrowBackIcon"
          )
        );

        // Return to home view
        await asyncPressEvent(
          getButtonByChildTestId(
            within(screen.queryByTestId("upperControlBar")),
            "iosArrowBackIcon"
          )
        );

        // Fake enough time has passed so more ads can be requested
        jest
          .spyOn(
            hasEnoughTimePastToShowInterstitialAd,
            "hasEnoughTimePastToShowInterstitialAd"
          )
          .mockReturnValue(true);

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

      it("Shows an error message and remounts the app when there is an issue loading a video", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        mocks.load.mockRejectedValue(null);
        mockMediaLibrary.singleAsset("./fake/file/path.jpeg");

        const screen = await asyncRender(<App />);

        // Pick a new video
        await asyncPressEvent(
          getButtonByText(
            within(screen.queryByTestId("homeView")),
            "Select a video to watch"
          )
        );

        // Confirm we are taken to the "select a video" page
        expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

        // Select the first video option
        await asyncPressEvent(
          getButtonByText(
            within(screen.queryByTestId("selectVideoListView")),
            "./fake/file/path.jpeg"
          )
        );

        // Confirm expected error message is shown
        expect(ToastAndroid.show).toHaveBeenCalledTimes(1);
        expect(ToastAndroid.show).toHaveBeenCalledWith(
          `Sorry, unable to load ./fake/file/path.jpeg. Please try again`,
          3000
        );

        silenceAllErrorLogs();

        // confirm the main container is unmounted
        await waitForExpect(() =>
          expect(screen.queryByTestId("mainContainer")).toBe(null)
        );

        // confirm the main container is mounted again
        await waitForExpect(() =>
          expect(screen.queryByTestId("mainContainer")).toBeTruthy()
        );
      });
    });
  });

  describe("Opening the disable ads view from the home view", () => {
    it("Opens the disable ads view when the 'disable ads' button is pressed", async () => {
      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const disableAdsButton = getButtonByText(within(homeView), "Disable ads");
      expect(disableAdsButton).toBeTruthy();

      // Press button to move to disable ads view
      await asyncPressEvent(disableAdsButton);

      // Confirm disable ad view is shown
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();
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
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // Shows an ad
      expect(AdMobInterstitial.showAdAsync).toHaveBeenCalledTimes(1);

      // Press button to pick another video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
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

      jest
        .spyOn(
          hasEnoughTimePastToShowInterstitialAd,
          "hasEnoughTimePastToShowInterstitialAd"
        )
        .mockReturnValue(true);

      // Press button to pick another video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      );

      // Confirm we are taken to the "select a video" page
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

      // Select the first video option
      await asyncPressEvent(
        getButtonByText(
          within(screen.queryByTestId("selectVideoListView")),
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

      it("allows the video to play when there is no interstitial ad to show", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { getIsReadyAsync } = mockAdMobInterstitial();
        mockMediaLibrary.singleAsset("path/to/file.mp4");

        const screen = await asyncRender(<App />);
        const homeView = screen.queryByTestId("homeView");
        expect(homeView).toBeTruthy();

        // Fake that the ad is not ready to show
        getIsReadyAsync.mockReturnValue(false);

        // Play the video and confirm the correct functions are called
        await startWatchingVideoFromUpperControlBar({
          screen,
          videoPlayerMocks: mocks,
          mockVideoFilepath: "path/to/file.mp4",
        });
      });

      it("catches the error and still allows the video to play when there is an issue confirming the ad is ready to show", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { getIsReadyAsync } = mockAdMobInterstitial();
        mockMediaLibrary.singleAsset("path/to/file");

        getIsReadyAsync.mockRejectedValue("fake getIsReadyAsync error");

        const screen = await asyncRender(<App />);

        await startWatchingVideoFromUpperControlBar({
          screen,
          videoPlayerMocks: mocks,
          mockVideoFilepath: "path/to/file",
        });

        // an error occurs
        expect(logError).toHaveBeenCalledWith("fake getIsReadyAsync error");
      });

      it("catches the error and still allows the video to play when there is an issue showing the ad", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        const { showAdAsync } = mockAdMobInterstitial();
        mockMediaLibrary.singleAsset("path/to/file");

        showAdAsync.mockRejectedValue("fake showAdAsync error");

        const screen = await asyncRender(<App />);

        await startWatchingVideoFromUpperControlBar({
          screen,
          videoPlayerMocks: mocks,
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
            within(screen.queryByTestId("upperControlBar")),
            "iosArrowBackIcon"
          )
        );
        // Return to home view
        await asyncPressEvent(
          getButtonByChildTestId(
            within(screen.queryByTestId("upperControlBar")),
            "iosArrowBackIcon"
          )
        );

        // Fake enough time has passed so more ads can be requested
        jest
          .spyOn(
            hasEnoughTimePastToShowInterstitialAd,
            "hasEnoughTimePastToShowInterstitialAd"
          )
          .mockReturnValue(true);

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

      it("Shows an error message and remounts the app when there is an issue loading a video from the upper control bar", async () => {
        const { mocks } = mockUseVideoPlayerRefs();
        mockMediaLibrary.singleAsset("path/to/file");
        mocks.load.mockRejectedValue(null);

        const screen = await asyncRender(<App />);

        // Pick a new video
        await asyncPressEvent(
          getButtonByChildTestId(
            within(screen.queryByTestId("upperControlBar")),
            "folderVideoIcon"
          )
        );

        // Confirm we are taken to the "select a video" page
        expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

        // Select the first video option
        await asyncPressEvent(
          getButtonByText(
            within(screen.queryByTestId("selectVideoListView")),
            "path/to/file"
          )
        );

        // Confirm expected error message is shown
        expect(ToastAndroid.show).toHaveBeenCalledTimes(1);
        expect(ToastAndroid.show).toHaveBeenCalledWith(
          `Sorry, unable to load path/to/file. Please try again`,
          3000
        );

        silenceAllErrorLogs();

        // confirm the main container is unmounted
        await waitForExpect(() =>
          expect(screen.queryByTestId("mainContainer")).toBe(null)
        );

        // confirm the main container is mounted again
        await waitForExpect(() =>
          expect(screen.queryByTestId("mainContainer")).toBeTruthy()
        );
      });
    });
  });

  describe("Unloading a video and returning to the 'select a video' view", () => {
    it("Is able to unload a video and return to the 'select a video' view when the back button is pressed", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // confirm the 'select a video' view is not visible
      expect(screen.queryByTestId("selectVideoListView")).toBe(null);

      // Return to the 'select a video' view
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      );

      // confirm video is unloaded
      expect(mocks.unload).toHaveBeenCalledTimes(1);

      // confirm the 'select a video' view is now visible
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();
    });

    it("Is able to unload a video and return to the 'select a video' view when the hardware back button is pressed", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      const getMockBackHandlerCallback = mockBackHandlerCallback();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // confirm the 'select a video' view is not visible
      expect(screen.queryByTestId("selectVideoListView")).toBe(null);

      // fire the event for the hardware back button
      const backHandlerCallback = getMockBackHandlerCallback();
      await act(async () => backHandlerCallback());

      // confirm video is unloaded
      expect(mocks.unload).toHaveBeenCalledTimes(1);

      // confirm the 'select a video' view is now visible
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();
    });

    it("Is able to unload a video and return to the 'select a video' view when the upper control bar 'select a video' button is pressed", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // confirm the 'select a video' view is not visible
      expect(screen.queryByTestId("selectVideoListView")).toBe(null);

      // Return to the 'select a video' view
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      );

      // confirm video is unloaded
      expect(mocks.unload).toHaveBeenCalledTimes(1);

      // confirm the 'select a video' view is now visible
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();
    });

    it("Unmounts and remounts the main container to reset the app if there is an issue unloading the video while using the back button", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // confirm the main container is mounted
      expect(screen.queryByTestId("mainContainer")).toBeTruthy();

      // Press the back button to unload the current video
      mocks.unload.mockRejectedValue(new Error("mock unload error"));
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      );

      silenceAllErrorLogs();

      // Confirm expected error message is shown
      expect(ToastAndroid.show).toHaveBeenCalledTimes(1);
      expect(ToastAndroid.show).toHaveBeenCalledWith(
        `Sorry, there was an issue removing the current video. Please try again`,
        3000
      );

      // confirm the main container is unmounted
      await waitForExpect(() =>
        expect(screen.queryByTestId("mainContainer")).toBe(null)
      );

      // confirm the main container is mounted again
      expect(await screen.findByTestId("mainContainer")).toBeTruthy();
    });

    it("Unmounts and remounts the main container to reset the app if there is an issue unloading the video while using the 'select a video' button", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      // confirm the 'select a video' view is not visible
      expect(screen.queryByTestId("selectVideoListView")).toBe(null);

      // Press the 'select a video' button to unload the current video
      mocks.unload.mockRejectedValue(new Error("mock unload error"));
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      );

      silenceAllErrorLogs();

      // Confirm expected error message is shown
      expect(ToastAndroid.show).toHaveBeenCalledTimes(1);
      expect(ToastAndroid.show).toHaveBeenCalledWith(
        `Sorry, there was an issue removing the current video. Please try again`,
        3000
      );

      // confirm the main container is unmounted
      await waitForExpect(() =>
        expect(screen.queryByTestId("mainContainer")).toBe(null)
      );

      // confirm the main container is mounted again
      expect(await screen.findByTestId("mainContainer")).toBeTruthy();
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
      const lowerControlBar = screen.queryByTestId("lowerControlBar");
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

      const timeBar = within(lowerControlBar).queryByTestId("timeBar");
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
      const sideBarLeft = screen.queryByTestId("sidebarLeft");
      expect(sideBarLeft).toBeTruthy();

      const replaySidebarButton = getButtonByChildTestId(
        within(sideBarLeft),
        "replay10Icon"
      );
      expect(buttonProps(replaySidebarButton).disabled).toBeFalsy();

      const sideBarRight = screen.queryByTestId("sidebarRight");
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
          within(screen.queryByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      ).toBeTruthy();
      expect(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      ).toBeTruthy();

      expect(
        within(screen.queryByTestId("upperControlBar")).getAllByRole("button")
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
          within(screen.queryByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      );

      // Video is unloaded
      expect(mocks.unload).toHaveBeenCalledTimes(1);

      // confirm the select video view is now visible
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();
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
      mocks.setPosition.mockClear();
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("lowerControlBar")),
          "pauseIcon"
        )
      );

      // Confirm pause was called
      expect(mocks.pause).toHaveBeenCalledTimes(1);
      // Confirm position is set to sync video players
      expect(mocks.setPosition).toHaveBeenCalledTimes(1);
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
          within(screen.queryByTestId("lowerControlBar")),
          "pauseIcon"
        )
      );

      // Confirm pause was called
      expect(mocks.pause).toHaveBeenCalledTimes(1);

      // Press the play button
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("lowerControlBar")),
          "playIcon"
        )
      );

      // Confirm play was called
      expect(mocks.pause).toHaveBeenCalledTimes(1);
    });

    it("Shows an error message and remounts the app when there is an issue playing the video", async () => {
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
          within(screen.queryByTestId("lowerControlBar")),
          "pauseIcon"
        )
      );

      // Mock an error when pressing the play button
      mocks.play.mockRejectedValue(new Error("unable to play"));

      // Press the play button
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("lowerControlBar")),
          "playIcon"
        )
      );

      // Confirm expected error message is shown
      expect(ToastAndroid.show).toHaveBeenCalledTimes(1);
      expect(ToastAndroid.show).toHaveBeenCalledWith(
        "Sorry, there was an issue trying to start the video. Please try again",
        3000
      );

      silenceAllErrorLogs();

      // confirm the main container is unmounted
      await waitForExpect(() =>
        expect(screen.queryByTestId("mainContainer")).toBe(null)
      );

      // confirm the main container is mounted again
      expect(await screen.findByTestId("mainContainer")).toBeTruthy();
    });

    it("Shows an error message and remounts the app when there is an issue pausing the video", async () => {
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

      // Mock an error when pressing the pause button
      mocks.pause.mockRejectedValue(new Error("unable to pause"));

      // Press the pause button
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("lowerControlBar")),
          "pauseIcon"
        )
      );

      // Confirm expected error message is shown
      expect(ToastAndroid.show).toHaveBeenCalledTimes(1);
      expect(ToastAndroid.show).toHaveBeenCalledWith(
        "Sorry, there was an issue trying to pause the video. Please try again",
        3000
      );

      silenceAllErrorLogs();

      // confirm the main container is unmounted
      await waitForExpect(() =>
        expect(screen.queryByTestId("mainContainer")).toBe(null)
      );

      // confirm the main container is mounted again
      expect(await screen.findByTestId("mainContainer")).toBeTruthy();
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
        videoPlayerProps(screen.queryByTestId("leftVideoPlayer")).style.width
      ).toBe("50%");
      expect(
        videoPlayerProps(screen.queryByTestId("rightVideoPlayer")).style.width
      ).toBe("50%");

      // Switch to using one video player
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("lowerControlBar")),
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
        videoPlayerProps(screen.queryByTestId("leftVideoPlayer")).style.width
      ).toBe("100%");
      expect(
        videoPlayerProps(screen.queryByTestId("rightVideoPlayer")).style.width
      ).toBe("0%");

      // Switch to using two video players
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("lowerControlBar")),
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
        videoPlayerProps(screen.queryByTestId("leftVideoPlayer")).style.width
      ).toBe("50%");
      expect(
        videoPlayerProps(screen.queryByTestId("rightVideoPlayer")).style.width
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
        videoPlayerProps(screen.queryByTestId("leftVideoPlayer")).style.width
      ).toBe("100%");
      expect(
        videoPlayerProps(screen.queryByTestId("rightVideoPlayer")).style.width
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
        videoPlayerProps(screen.queryByTestId("leftVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_COVER);
      expect(
        videoPlayerProps(screen.queryByTestId("rightVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_COVER);

      // Change to the next resize mode
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("lowerControlBar")),
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
        videoPlayerProps(screen.queryByTestId("leftVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_CONTAIN);
      expect(
        videoPlayerProps(screen.queryByTestId("rightVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_CONTAIN);

      // Change to the next resize mode
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("lowerControlBar")),
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
        videoPlayerProps(screen.queryByTestId("leftVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_STRETCH);
      expect(
        videoPlayerProps(screen.queryByTestId("rightVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_STRETCH);

      // Change to the next resize mode
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("lowerControlBar")),
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
        videoPlayerProps(screen.queryByTestId("leftVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_COVER);
      expect(
        videoPlayerProps(screen.queryByTestId("rightVideoPlayer")).resizeMode
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
        videoPlayerProps(screen.queryByTestId("leftVideoPlayer")).resizeMode
      ).toBe(RESIZE_MODES.RESIZE_MODE_CONTAIN);
      expect(
        videoPlayerProps(screen.queryByTestId("rightVideoPlayer")).resizeMode
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

      const lowerControlBar = screen.queryByTestId("lowerControlBar");
      const timeBar = within(lowerControlBar).queryByTestId("timeBar");

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

      const lowerControlBar = screen.queryByTestId("lowerControlBar");
      const timeBar = within(lowerControlBar).queryByTestId("timeBar");
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
      const lowerControlBar = screen.queryByTestId("lowerControlBar");
      const timeBar = within(lowerControlBar).queryByTestId("timeBar");
      expect(timeBar.props.value).toBe(0);

      silenceAllErrorLogs();

      expect(await within(lowerControlBar).findByText("00:01"));
      expect(timeBar.props.value).toBeGreaterThan(1000);
      expect(timeBar.props.value).toBeLessThan(2000);

      expect(await within(lowerControlBar).findByText("00:02"));
      expect(timeBar.props.value).toBeGreaterThan(2000);
      expect(timeBar.props.value).toBeLessThan(3000);

      expect(await within(lowerControlBar).findByText("00:03"));
      expect(timeBar.props.value).toBeGreaterThan(3000);
      expect(timeBar.props.value).toBeLessThan(4000);
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

      const lowerControlBar = screen.queryByTestId("lowerControlBar");

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

      const lowerControlBar = screen.queryByTestId("lowerControlBar");

      // Confirm the correct time is shown
      silenceAllErrorLogs();
      expect(
        await within(lowerControlBar).findByText("9999:00:00")
      ).toBeTruthy();
    });

    it("Keeps the screen turned on while a video is playing", async () => {
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

      // Confirm the function to keep the screen on has been called
      expect(activateKeepAwake).toHaveBeenCalledTimes(1);
    });

    it("Stops the screen from remaining turned on while after a video stops playing", async () => {
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

      // Confirm the function to keep the screen on has been called
      expect(activateKeepAwake).toHaveBeenCalledTimes(1);

      // Return to the 'select a video' view
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      );

      // Confirm the function to allow the screen to turn on after inactivity has been called
      expect(deactivateKeepAwake).toHaveBeenCalledTimes(1);
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
          within(screen.queryByTestId("lowerControlBar")),
          "pauseIcon"
        )
      );
      // Reset mock as pausing will have called setPosition
      mocks.setPosition.mockClear();

      const lowerControlBar = screen.queryByTestId("lowerControlBar");
      const props = getTimeBarProps(
        within(lowerControlBar).queryByTestId("timeBar")
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

      const lowerControlBar = screen.queryByTestId("lowerControlBar");
      const props = getTimeBarProps(
        within(lowerControlBar).queryByTestId("timeBar")
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
          within(screen.queryByTestId("lowerControlBar")),
          "pauseIcon"
        )
      );

      const lowerControlBar = screen.queryByTestId("lowerControlBar");
      const props = getTimeBarProps(
        within(lowerControlBar).queryByTestId("timeBar")
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

      const lowerControlBar = screen.queryByTestId("lowerControlBar");

      const onSeekStart = getTimeBarProps(
        within(lowerControlBar).queryByTestId("timeBar")
      ).onSlidingStart;

      // start seeking for the new video position
      await act(async () => onSeekStart(10_000));

      const onSeekComplete = getTimeBarProps(
        within(lowerControlBar).queryByTestId("timeBar")
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
          within(screen.queryByTestId("lowerControlBar")),
          "pauseIcon"
        )
      );

      const lowerControlBar = screen.queryByTestId("lowerControlBar");

      const onSeekStart = getTimeBarProps(
        within(lowerControlBar).queryByTestId("timeBar")
      ).onSlidingStart;

      // start seeking for the new video position
      await act(async () => onSeekStart(10_000));

      const onSeekComplete = getTimeBarProps(
        within(lowerControlBar).queryByTestId("timeBar")
      ).onSlidingComplete;

      // Finish seeking and end on the last position
      mocks.play.mockClear();
      await act(async () => onSeekComplete(10_000));

      // Does not start playing the video again
      expect(mocks.play).not.toHaveBeenCalled();
    });

    it("Shows an error message and remounts the app if there is an issue pausing the video while seeking", async () => {
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

      const lowerControlBar = screen.queryByTestId("lowerControlBar");
      const props = getTimeBarProps(
        within(lowerControlBar).queryByTestId("timeBar")
      );

      const onSeekStart = props.onSlidingStart;

      // start seeking for the new video position
      mocks.pause.mockRejectedValue(new Error("unable to pause"));
      await act(async () => onSeekStart(10_000));

      // Confirm expected error message is shown
      expect(ToastAndroid.show).toHaveBeenCalledTimes(1);
      expect(ToastAndroid.show).toHaveBeenCalledWith(
        "Sorry, there was an issue trying to pause the video. Please try again",
        3000
      );

      silenceAllErrorLogs();

      // confirm the main container is unmounted
      await waitForExpect(() =>
        expect(screen.queryByTestId("mainContainer")).toBe(null)
      );

      // confirm the main container is mounted again
      expect(await screen.findByTestId("mainContainer")).toBeTruthy();
    });

    it("Shows an error message and remounts the app if there is an issue setting the position of the video while seeking", async () => {
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

      // Reset mock as pausing will have called setPosition
      mocks.setPosition.mockClear();

      const lowerControlBar = screen.queryByTestId("lowerControlBar");

      const onSeekStart = getTimeBarProps(
        within(lowerControlBar).queryByTestId("timeBar")
      ).onSlidingStart;

      // start seeking for the new video position
      await act(async () => onSeekStart(10_000));

      // Finish seeking and end on the last position
      mocks.setPosition.mockRejectedValue(
        new Error("unable to set videos position")
      );
      const onSeekComplete = getTimeBarProps(
        within(lowerControlBar).queryByTestId("timeBar")
      ).onSlidingComplete;

      await act(async () => onSeekComplete(20_000));

      // Confirm expected error message is shown
      expect(ToastAndroid.show).toHaveBeenCalledTimes(1);
      expect(ToastAndroid.show).toHaveBeenCalledWith(
        "Sorry, there was an issue trying to update the video position. Please try again",
        3000
      );

      silenceAllErrorLogs();

      // confirm the main container is unmounted
      await waitForExpect(() =>
        expect(screen.queryByTestId("mainContainer")).toBe(null)
      );

      // confirm the main container is mounted again
      expect(await screen.findByTestId("mainContainer")).toBeTruthy();
    });

    it("Shows an error message and remounts the app if there is an issue playing the video after seeking", async () => {
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

      // Reset mock as pausing will have called setPosition
      mocks.setPosition.mockClear();

      const lowerControlBar = screen.queryByTestId("lowerControlBar");
      const props = getTimeBarProps(
        within(lowerControlBar).queryByTestId("timeBar")
      );

      // start seeking for the new video position
      const onSeekStart = getTimeBarProps(
        within(lowerControlBar).queryByTestId("timeBar")
      ).onSlidingStart;

      await act(async () => onSeekStart(10_000));

      // Finish seeking
      const onSeekComplete = getTimeBarProps(
        within(lowerControlBar).queryByTestId("timeBar")
      ).onSlidingComplete;
      mocks.play.mockRejectedValue(new Error("unable to play video"));
      await act(async () => onSeekComplete(20_000));

      // Confirm expected error message is shown
      expect(ToastAndroid.show).toHaveBeenCalledTimes(1);
      expect(ToastAndroid.show).toHaveBeenCalledWith(
        "Sorry, there was an issue trying to start the video. Please try again",
        3000
      );

      silenceAllErrorLogs();

      // confirm the main container is unmounted
      await waitForExpect(() =>
        expect(screen.queryByTestId("mainContainer")).toBe(null)
      );

      // confirm the main container is mounted again
      expect(await screen.findByTestId("mainContainer")).toBeTruthy();
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

    it("updates the position to resync the videos when the primary video is ahead of the secondary by 200 milliseconds", async () => {
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

      const lowerControlBar = screen.queryByTestId("lowerControlBar");

      silenceAllErrorLogs();

      // Confirm the start position is 0
      expect(within(lowerControlBar).queryByTestId("timeBar").props.value).toBe(
        0
      );

      // Move the position forward by 10 seconds
      const forwardSidebarButton = getButtonByChildTestId(
        within(screen.queryByTestId("sidebarRight")),
        "forward10Icon"
      );
      await asyncPressEvent(forwardSidebarButton);

      expect(await within(lowerControlBar).findByText("00:10")).toBeTruthy();
      expect(mocks.setPosition).toHaveBeenCalledWith(10_000);
      expect(within(lowerControlBar).queryByTestId("timeBar").props.value).toBe(
        10_000
      );

      // Move the position back by 10 seconds
      const replaySidebarButton = getButtonByChildTestId(
        within(screen.queryByTestId("sidebarLeft")),
        "replay10Icon"
      );
      await asyncPressEvent(replaySidebarButton);

      expect(await within(lowerControlBar).findByText("00:00")).toBeTruthy();
      expect(mocks.setPosition).toHaveBeenCalledWith(0);
      expect(within(lowerControlBar).queryByTestId("timeBar").props.value).toBe(
        0
      );
    }, 10_000);

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

      const lowerControlBar = screen.queryByTestId("lowerControlBar");

      silenceAllErrorLogs();

      // Confirm the start position is 0
      expect(within(lowerControlBar).queryByTestId("timeBar").props.value).toBe(
        0
      );

      // Move the position back by 10 seconds
      const replaySidebarButton = getButtonByChildTestId(
        within(screen.queryByTestId("sidebarLeft")),
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

      const lowerControlBar = screen.queryByTestId("lowerControlBar");

      silenceAllErrorLogs();

      // Confirm the start position is 0
      expect(within(lowerControlBar).queryByTestId("timeBar").props.value).toBe(
        0
      );

      // Move the position forward by 10 seconds
      const forwardSidebarButton = getButtonByChildTestId(
        within(screen.queryByTestId("sidebarRight")),
        "forward10Icon"
      );
      await asyncPressEvent(forwardSidebarButton);

      await waitForExpect(async () => {
        expect(mocks.setPosition).toHaveBeenCalledTimes(1);
        expect(mocks.setPosition).toHaveBeenCalledWith(5_000);
      });
    });

    it("Shows an error message and remounts the app when there is an issue updating the video position with the forward sidebar button", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      mocks.getStatus.mockResolvedValue({
        primaryStatus: { positionMillis: 0, durationMillis: 100_000 },
        secondaryStatus: { positionMillis: 0, durationMillis: 100_000 },
      });

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      silenceAllErrorLogs();

      // Move the position forward by 10 seconds
      mocks.setPosition.mockRejectedValue(new Error("unable to set position"));
      const forwardSidebarButton = getButtonByChildTestId(
        within(screen.queryByTestId("sidebarRight")),
        "forward10Icon"
      );
      await asyncPressEvent(forwardSidebarButton);

      // Confirm expected error message is shown
      expect(ToastAndroid.show).toHaveBeenCalledTimes(1);
      expect(ToastAndroid.show).toHaveBeenCalledWith(
        "Sorry, there was an issue trying to update the video position. Please try again",
        3000
      );

      silenceAllErrorLogs();

      // confirm the main container is unmounted
      await waitForExpect(() =>
        expect(screen.queryByTestId("mainContainer")).toBe(null)
      );

      // confirm the main container is mounted again
      expect(await screen.findByTestId("mainContainer")).toBeTruthy();
    });

    it("Shows an error message and remounts the app when there is an issue updating the video position with the replay sidebar button", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file.mp4");

      mocks.getStatus.mockResolvedValue({
        primaryStatus: { positionMillis: 50_000, durationMillis: 100_000 },
        secondaryStatus: { positionMillis: 50_000, durationMillis: 100_000 },
      });

      const screen = await asyncRender(<App />);

      // Play the video and confirm the correct functions are called
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        getInterstitialDidCloseCallback,
        mockVideoFilepath: "path/to/file.mp4",
      });

      silenceAllErrorLogs();

      // Move the position forward by 10 seconds
      mocks.setPosition.mockRejectedValue(new Error("unable to set position"));
      const replaySidebarButton = getButtonByChildTestId(
        within(screen.queryByTestId("sidebarLeft")),
        "replay10Icon"
      );
      await asyncPressEvent(replaySidebarButton);

      // Confirm expected error message is shown
      expect(ToastAndroid.show).toHaveBeenCalledTimes(1);
      expect(ToastAndroid.show).toHaveBeenCalledWith(
        "Sorry, there was an issue trying to update the video position. Please try again",
        3000
      );

      silenceAllErrorLogs();

      // confirm the main container is unmounted
      await waitForExpect(() =>
        expect(screen.queryByTestId("mainContainer")).toBe(null)
      );

      // confirm the main container is mounted again
      expect(await screen.findByTestId("mainContainer")).toBeTruthy();
    });
  });

  describe("viewing the disable ads view", () => {
    it("can go to the disable ads page", async () => {
      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);

      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      const disableAsRewardButton = getButtonByText(
        within(screen.queryByTestId("disableAdsView")),
        "Watch a short ad and disable all other ads for 20 minutes"
      );
      expect(disableAsRewardButton).toBeTruthy();

      const buyTheAppButton = getButtonByText(
        within(screen.queryByTestId("disableAdsView")),
        "Buy the ad-free version of the app"
      );
      expect(buyTheAppButton).toBeTruthy();
    });

    it("shows a different message on the disable ads button when ads are already disabled", async () => {
      mockAdsAreDisabled();

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      await asyncPressEvent(disableAdsButton);

      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      const disableAsRewardButton = getButtonByText(
        within(screen.queryByTestId("disableAdsView")),
        "Ads are already disabled. Add more time by watching another short ad"
      );
      expect(disableAsRewardButton).toBeTruthy();
    });

    it("shows a message about how long ads are disabled for when they are disabled", async () => {
      mockAdsAreDisabled();

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      await asyncPressEvent(disableAdsButton);

      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      expect(
        within(screen.queryByTestId("disableAdsView")).getByText(
          /^Ads are disabled for \d\d:\d\d$/
        )
      ).toBeTruthy();
    });

    it("Links to the paid version of the app on google play when the 'by the app' button is pressed", async () => {
      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);

      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      const buyTheAppButton = getButtonByText(
        within(screen.queryByTestId("disableAdsView")),
        "Buy the ad-free version of the app"
      );
      expect(buyTheAppButton).toBeTruthy();

      // Press the button to buy the app
      await asyncPressEvent(buyTheAppButton);

      // Confirm the user is linked to the correct page
      expect(Linking.openURL).toHaveBeenCalledTimes(1);
      expect(Linking.openURL).toHaveBeenCalledWith(
        "https://play.google.com/store/apps/details?id=com.just_for_fun.watch_in_vr"
      );
    });

    it("Shows the expected icons on the upper control bar while on the 'disable ads' view", async () => {
      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);

      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      // Confirm the expected icons on on the upper control bar
      expect(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      ).toBeTruthy();
      expect(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      ).toBeTruthy();

      expect(
        within(screen.queryByTestId("upperControlBar")).getAllByRole("button")
      ).toHaveLength(2);
    });

    it("Disables all lower bar controls while on the disable ads view", async () => {
      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      // Confirm the view we are on
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      // Confirm all buttons are disabled
      const lowerControlBar = screen.queryByTestId("lowerControlBar");
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

      const timeBar = within(lowerControlBar).queryByTestId("timeBar");
      expect(timeBar.props.disabled).toBeTruthy();
    });

    it("Hides all side bar controls while on the disable ads view", async () => {
      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      // Confirm the view we are on
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      // Confirm buttons are hidden
      const sideBarLeft = screen.queryByTestId("sidebarLeft");
      expect(sideBarLeft).toBe(null);

      const sideBarRight = screen.queryByTestId("sidebarRight");
      expect(sideBarRight).toBe(null);
    });

    it("Shows a banner ad on the disable ads view", async () => {
      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);

      // Confirm the current view
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      // Check ad banner is visible
      expect(screen.queryByTestId("bannerAd")).toBeTruthy();
    });

    it("Hide the banner ad on the home view if ads are disabled", async () => {
      mockAdsAreDisabled();

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);

      // Confirm the current view
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      // Check ad banner is not visible
      expect(screen.queryByTestId("bannerAd")).toBe(null);
    });

    it("returns to the home view when the back button is pressed after viewing the disable ads view", async () => {
      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      // Confirm the view we are on
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      // Return to home view with the back button
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.queryByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      );

      // confirm the home view is now visible
      expect(screen.queryByTestId("homeView")).toBeTruthy();
    });

    it("returns to the home view when the hardware back button is pressed after viewing the disable ads view", async () => {
      const screen = await asyncRender(<App />);
      const getMockBackHandlerCallback = mockBackHandlerCallback();

      const disableAdsButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      // Confirm the view we are on
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      // fire the event for the hardware back button
      const backHandlerCallback = getMockBackHandlerCallback();
      await act(async () => backHandlerCallback());

      // confirm the home view is now visible
      expect(screen.queryByTestId("homeView")).toBeTruthy();
    });
  });

  describe("Can disable ads", () => {
    it("Sets the reward ad unit id on mount", async () => {
      const mockRewardAds = mockAdMobRewarded();

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      expect(mockRewardAds.setAdUnitID).toHaveBeenCalledTimes(1);
    });

    it("loads and shows the reward ad when the disable button is pressed", async () => {
      const mockRewardAds = mockAdMobRewarded();

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.queryByTestId("disableAdsView")),
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
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.queryByTestId("disableAdsView")),
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
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.queryByTestId("disableAdsView")),
          "Watch a short ad and disable all other ads for 20 minutes"
        )
      );

      // Earn the reward
      const earnRewardCallback = mockRewardAds.getEarnRewardCallback();
      await act(async () => earnRewardCallback());

      // Check the disable message is shown
      expect(
        within(screen.queryByTestId("disableAdsView")).queryByTestId("bannerAd")
      ).toBe(null);
    });

    it("Stops showing the banner ad after ads are disabled", async () => {
      const mockRewardAds = mockAdMobRewarded();

      jest.spyOn(asyncStorage.adsDisabledTime, "save");

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      // confirm the ad banner is visible before disabling ads
      expect(screen.queryByTestId("bannerAd")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.queryByTestId("disableAdsView")),
          "Watch a short ad and disable all other ads for 20 minutes"
        )
      );

      // Earn the reward
      const earnRewardCallback = mockRewardAds.getEarnRewardCallback();
      await act(async () => earnRewardCallback());

      // Check ad banner is not visible
      expect(screen.queryByTestId("bannerAd")).toBe(null);
    });

    it("shows an error alert if the reward ad fails to load", async () => {
      const mockRewardAds = mockAdMobRewarded();

      // Errors when an ad is loaded
      mockRewardAds.requestAdAsync.mockRejectedValue("error requesting ad");

      jest.spyOn(Alert, "alert");

      const screen = await asyncRender(<App />);

      const disableAdsButton = getButtonByText(
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.queryByTestId("disableAdsView")),
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
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.queryByTestId("disableAdsView")),
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
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.queryByTestId("disableAdsView")),
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
        within(screen.queryByTestId("homeView")),
        "Disable ads"
      );
      expect(disableAdsButton).toBeTruthy();

      // Visit the disable ads view
      await asyncPressEvent(disableAdsButton);
      expect(screen.queryByTestId("disableAdsView")).toBeTruthy();

      // Press the button to views ads and disable other ads
      await asyncPressEvent(
        getButtonByText(
          within(screen.queryByTestId("disableAdsView")),
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

  describe("Can create a playlist of videos", () => {
    it("Starts making a playlist after pressing the button on the upper control bar", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("file");

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

      // Press the button to start making a playlist
      expect(screen.queryByTestId("upperControlBar")).toBeTruthy();
      const playlistButton = getButtonByChildTestId(
        within(screen.getByTestId("upperControlBar")),
        "playlistAddIcon"
      );
      expect(playlistButton).toBeTruthy();
      await asyncPressEvent(playlistButton);

      // Confirm the playlist view is visible
      expect(screen.queryByTestId("playlistVideoListView"));
      expect(
        getButtonByText(
          within(screen.getByTestId("playlistVideoListView")),
          "Start Playlist"
        )
      ).toBeTruthy();
    });

    it("Disables the 'start playlist' button while no videos are in the playlist", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.singleAsset("file");

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

      // Press the button to start making a playlist
      expect(screen.queryByTestId("upperControlBar")).toBeTruthy();
      const playlistButton = getButtonByChildTestId(
        within(screen.getByTestId("upperControlBar")),
        "playlistAddIcon"
      );
      expect(playlistButton).toBeTruthy();
      await asyncPressEvent(playlistButton);

      // Confirm the start playlist button is disabled
      expect(
        buttonProps(
          getButtonByText(
            within(screen.getByTestId("playlistVideoListView")),
            "Start Playlist"
          )
        ).disabled
      ).toBe(true);
    });

    it("Allows videos to be added to the playlist", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-short.mp4`,
          filename: `file-short.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01").getTime(),
        },
        {
          uri: `path/to/file-mid.mp4`,
          filename: `file-mid.mp4`,
          duration: 630, // 10 minutes 30 seconds
          modificationTime: new Date("2020-08-15").getTime(),
        },
        {
          uri: `path/to/file-long.mp4`,
          filename: `file-long.mp4`,
          duration: 7800, // 2 hours 10 minutes
          modificationTime: new Date("2020-07-23").getTime(),
        },
      ]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are taken to the "select a video" page
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

      // Confirm videos can be added to a playlist
      await addMultipleVideosToAPlaylist({
        screen,
        videoFileNames: [`file-short.mp4`, `file-mid.mp4`, `file-long.mp4`],
      });
    });

    it("Shows a warning message if the same video is added to the playlist twice", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-short.mp4`,
          filename: `file-short.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01").getTime(),
        },
      ]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm we are on the "select a video" page
      expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

      // Press the button to start making a playlist
      const playlistButton = getButtonByChildTestId(
        within(screen.getByTestId("upperControlBar")),
        "playlistAddIcon"
      );
      expect(playlistButton).toBeTruthy();
      await asyncPressEvent(playlistButton);

      // Confirm the playlist view is visible
      expect(screen.queryByTestId("playlistVideoListView"));

      // Select videos to add to the playlist
      const videoFileNames = [`file-short.mp4`, `file-short.mp4`];
      const videoButtons = videoFileNames.map((filename) =>
        getButtonByText(
          within(screen.getByTestId("selectVideoListView")),
          filename
        )
      );

      for (const button of videoButtons) expect(button).toBeTruthy();
      for (const button of videoButtons) await asyncPressEvent(button);

      // Confirm the warning message was shown
      expect(ToastAndroid.show).toHaveBeenCalledTimes(1);
      expect(ToastAndroid.show).toHaveBeenCalledWith(
        "file-short.mp4 is already in the playlist",
        3000
      );
    });

    it("Enables the 'start playlist' button after videos have been added to the playlist", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-short.mp4`,
          filename: `file-short.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01").getTime(),
        },
      ]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Add video to the playlist
      await addMultipleVideosToAPlaylist({
        screen,
        videoFileNames: [`file-short.mp4`],
      });

      // Confirm the start playlist button is enabled
      expect(
        buttonProps(
          getButtonByText(
            within(screen.getByTestId("playlistVideoListView")),
            "Start Playlist"
          )
        ).disabled
      ).toBe(false);
    });

    it("Allows videos to be removed from the playlist", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-short.mp4`,
          filename: `file-short.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01").getTime(),
        },
      ]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Add video to the playlist
      await addMultipleVideosToAPlaylist({
        screen,
        videoFileNames: [`file-short.mp4`],
      });

      // Remove the video from the playlist
      const removeFromPlaylistButton = getButtonByChildTestId(
        within(screen.queryByTestId("playlistVideoListView")),
        "binIcon"
      );
      expect(removeFromPlaylistButton).toBeTruthy();
      await asyncPressEvent(removeFromPlaylistButton);

      // Confirm the playlist is empty again
      expect(
        within(screen.queryByTestId("playlistVideoListView")).queryByText(
          "file-short.mp4"
        )
      ).toBe(null);
    });

    it("Allows the order of videos in a playlist to be changed", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-short.mp4`,
          filename: `file-short.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01").getTime(),
        },
        {
          uri: `path/to/file-mid.mp4`,
          filename: `file-mid.mp4`,
          duration: 630, // 10 minutes 30 seconds
          modificationTime: new Date("2020-08-15").getTime(),
        },
        {
          uri: `path/to/file-long.mp4`,
          filename: `file-long.mp4`,
          duration: 7800, // 2 hours 10 minutes
          modificationTime: new Date("2020-07-23").getTime(),
        },
      ]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Add video to the playlist
      await addMultipleVideosToAPlaylist({
        screen,
        videoFileNames: [`file-short.mp4`, `file-mid.mp4`, `file-long.mp4`],
      });

      // Confirm the order of the videos in the playlist
      const playlistVideos = within(
        screen.getByTestId("playlistVideoListView")
      ).queryAllByTestId("playlistVideoButton");
      expect(playlistVideos).toHaveLength(3);
      expect(within(playlistVideos[0]).queryByText("file-short.mp4"));
      expect(within(playlistVideos[1]).queryByText("file-mid.mp4"));
      expect(within(playlistVideos[2]).queryByText("file-long.mp4"));

      // Move the second position to the first position
      await asyncPressEvent(
        getButtonByChildTestId(within(playlistVideos[1]), "priorityHighIcon")
      );

      const playlistVideosAfterPriorityUp = within(
        screen.getByTestId("playlistVideoListView")
      ).queryAllByTestId("playlistVideoButton");
      expect(
        within(playlistVideosAfterPriorityUp[0]).queryByText("file-mid.mp4")
      ).toBeTruthy();
      expect(
        within(playlistVideosAfterPriorityUp[1]).queryByText("file-short.mp4")
      ).toBeTruthy();

      // Move the second position to the third position
      await asyncPressEvent(
        getButtonByChildTestId(
          within(playlistVideosAfterPriorityUp[1]),
          "priorityLowIcon"
        )
      );

      const playlistVideosAfterPriorityDown = within(
        screen.getByTestId("playlistVideoListView")
      ).queryAllByTestId("playlistVideoButton");
      expect(
        within(playlistVideosAfterPriorityDown[1]).queryByText("file-long.mp4")
      ).toBeTruthy();
      expect(
        within(playlistVideosAfterPriorityDown[2]).queryByText("file-short.mp4")
      ).toBeTruthy();
    });

    it("Disables the increase priority button for the top video in a playlist", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-short.mp4`,
          filename: `file-short.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01").getTime(),
        },
        {
          uri: `path/to/file-mid.mp4`,
          filename: `file-mid.mp4`,
          duration: 630, // 10 minutes 30 seconds
          modificationTime: new Date("2020-08-15").getTime(),
        },
        {
          uri: `path/to/file-long.mp4`,
          filename: `file-long.mp4`,
          duration: 7800, // 2 hours 10 minutes
          modificationTime: new Date("2020-07-23").getTime(),
        },
      ]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm videos can be added to a playlist
      await addMultipleVideosToAPlaylist({
        screen,
        videoFileNames: [`file-short.mp4`, `file-mid.mp4`, `file-long.mp4`],
      });

      const playlistVideos = within(
        screen.getByTestId("playlistVideoListView")
      ).queryAllByTestId("playlistVideoButton");
      const priorityUpButton = getButtonByChildTestId(
        within(playlistVideos[0]),
        "priorityHighIcon"
      );
      const priorityDownButton = getButtonByChildTestId(
        within(playlistVideos[0]),
        "priorityLowIcon"
      );
      expect(priorityUpButton).toBeTruthy();
      expect(priorityDownButton).toBeTruthy();
      expect(buttonProps(priorityUpButton).disabled).toBe(true);
      expect(buttonProps(priorityDownButton).disabled).toBe(false);
    });

    it("Disables the decrease priority button for the bottom video in a playlist", async () => {
      mockUseVideoPlayerRefs();
      mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-short.mp4`,
          filename: `file-short.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01").getTime(),
        },
        {
          uri: `path/to/file-mid.mp4`,
          filename: `file-mid.mp4`,
          duration: 630, // 10 minutes 30 seconds
          modificationTime: new Date("2020-08-15").getTime(),
        },
        {
          uri: `path/to/file-long.mp4`,
          filename: `file-long.mp4`,
          duration: 7800, // 2 hours 10 minutes
          modificationTime: new Date("2020-07-23").getTime(),
        },
      ]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm videos can be added to a playlist
      await addMultipleVideosToAPlaylist({
        screen,
        videoFileNames: [`file-short.mp4`, `file-mid.mp4`, `file-long.mp4`],
      });

      const playlistVideos = within(
        screen.getByTestId("playlistVideoListView")
      ).queryAllByTestId("playlistVideoButton");
      const priorityUpButton = getButtonByChildTestId(
        within(playlistVideos[2]),
        "priorityHighIcon"
      );
      const priorityDownButton = getButtonByChildTestId(
        within(playlistVideos[2]),
        "priorityLowIcon"
      );
      expect(priorityUpButton).toBeTruthy();
      expect(priorityDownButton).toBeTruthy();
      expect(buttonProps(priorityUpButton).disabled).toBe(false);
      expect(buttonProps(priorityDownButton).disabled).toBe(true);
    });
  });

  describe("Can play videos in a playlist", () => {
    it("Can start playing the playlist after videos have been added", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-short.mp4`,
          filename: `file-short.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01").getTime(),
        },
        {
          uri: `path/to/file-mid.mp4`,
          filename: `file-mid.mp4`,
          duration: 630, // 10 minutes 30 seconds
          modificationTime: new Date("2020-08-15").getTime(),
        },
        {
          uri: `path/to/file-long.mp4`,
          filename: `file-long.mp4`,
          duration: 7800, // 2 hours 10 minutes
          modificationTime: new Date("2020-07-23").getTime(),
        },
      ]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm videos can be added to a playlist
      await addMultipleVideosToAPlaylist({
        screen,
        videoFileNames: [`file-short.mp4`, `file-mid.mp4`, `file-long.mp4`],
      });

      // Press the start playlist button
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("playlistVideoListView")),
          "Start Playlist"
        )
      );

      // Fire the callback to close the ad
      const fireDidCloseCallback = getInterstitialDidCloseCallback();
      act(fireDidCloseCallback);

      // Confirm the first video is loaded and starts to play
      expect(mocks.load).toHaveBeenCalledTimes(1);
      expect(mocks.load).toHaveBeenCalledWith(
        {
          filename: "file-short.mp4",
          uri: `path/to/file-short.mp4`,
          duration: 30000,
          modificationTime: 1598918400000,
        },
        {
          primaryOptions: {
            isLooping: false,
          },
          secondaryOptions: {
            isMuted: true,
            isLooping: false,
          },
        }
      );
      expect(mocks.getStatus).toHaveBeenCalledTimes(1);

      expect(mocks.play).toHaveBeenCalledTimes(1);
    });

    it("Starts playing the next video after the previous has finished", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-short.mp4`,
          filename: `file-short.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01").getTime(),
        },
        {
          uri: `path/to/file-mid.mp4`,
          filename: `file-mid.mp4`,
          duration: 630, // 10 minutes 30 seconds
          modificationTime: new Date("2020-08-15").getTime(),
        },
        {
          uri: `path/to/file-long.mp4`,
          filename: `file-long.mp4`,
          duration: 7800, // 2 hours 10 minutes
          modificationTime: new Date("2020-07-23").getTime(),
        },
      ]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm videos can be added to a playlist
      await addMultipleVideosToAPlaylist({
        screen,
        videoFileNames: [`file-short.mp4`, `file-mid.mp4`, `file-long.mp4`],
      });

      // Press the start playlist button
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("playlistVideoListView")),
          "Start Playlist"
        )
      );

      // Fire the callback to close the ad
      const fireDidCloseCallback = getInterstitialDidCloseCallback();
      act(fireDidCloseCallback);

      // Confirm the first video is loaded and starts to play
      expect(mocks.load).toHaveBeenCalledTimes(1);
      expect(mocks.play).toHaveBeenCalledTimes(1);

      // Fake the video reaching the end
      mocks.getStatus.mockResolvedValueOnce({
        primaryStatus: { positionMillis: 1000, durationMillis: 1000 },
        secondaryStatus: { positionMillis: 1000, durationMillis: 1000 },
      });
      // Return to normal after identifying the end has been reached
      mocks.getStatus.mockResolvedValue({
        primaryStatus: { positionMillis: 0, durationMillis: 1000 },
        secondaryStatus: { positionMillis: 0, durationMillis: 1000 },
      });

      // Confirm the next video is loaded and starts to play
      silenceAllErrorLogs();
      await waitForExpect(() => expect(mocks.load).toHaveBeenCalledTimes(2));
      enableAllErrorLogs();
      expect(mocks.load).toHaveBeenCalledWith(
        {
          filename: "file-mid.mp4",
          uri: `path/to/file-mid.mp4`,
          duration: 630000,
          modificationTime: 1597449600000,
        },
        {
          primaryOptions: {
            isLooping: false,
          },
          secondaryOptions: {
            isMuted: true,
            isLooping: false,
          },
        }
      );
      expect(mocks.play).toHaveBeenCalledTimes(2);
    });

    it("Only shows an ad for the first video in the playlist", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback, showAdAsync } =
        mockAdMobInterstitial();
      mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-short.mp4`,
          filename: `file-short.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01").getTime(),
        },
        {
          uri: `path/to/file-mid.mp4`,
          filename: `file-mid.mp4`,
          duration: 630, // 10 minutes 30 seconds
          modificationTime: new Date("2020-08-15").getTime(),
        },
        {
          uri: `path/to/file-long.mp4`,
          filename: `file-long.mp4`,
          duration: 7800, // 2 hours 10 minutes
          modificationTime: new Date("2020-07-23").getTime(),
        },
      ]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm videos can be added to a playlist
      await addMultipleVideosToAPlaylist({
        screen,
        videoFileNames: [`file-short.mp4`, `file-mid.mp4`, `file-long.mp4`],
      });

      // Press the start playlist button
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("playlistVideoListView")),
          "Start Playlist"
        )
      );

      // Confirm the ad is shown
      expect(showAdAsync).toHaveBeenCalledTimes(1);

      // Fire the callback to close the ad
      const fireDidCloseCallback = getInterstitialDidCloseCallback();
      act(fireDidCloseCallback);

      // Confirm the first video is loaded and starts to play
      expect(mocks.load).toHaveBeenCalledTimes(1);
      expect(mocks.play).toHaveBeenCalledTimes(1);

      // Fake the video reaching the end
      mocks.getStatus.mockResolvedValueOnce({
        primaryStatus: { positionMillis: 1000, durationMillis: 1000 },
        secondaryStatus: { positionMillis: 1000, durationMillis: 1000 },
      });
      // Return to normal after identifying the end has been reached
      mocks.getStatus.mockResolvedValue({
        primaryStatus: { positionMillis: 0, durationMillis: 1000 },
        secondaryStatus: { positionMillis: 0, durationMillis: 1000 },
      });

      // Fake enough time has passed so more ads can be requested
      jest
        .spyOn(
          hasEnoughTimePastToShowInterstitialAd,
          "hasEnoughTimePastToShowInterstitialAd"
        )
        .mockReturnValue(true);

      // Confirm the next video is loaded and starts to play
      silenceAllErrorLogs();
      await waitForExpect(() => expect(mocks.load).toHaveBeenCalledTimes(2));
      enableAllErrorLogs();
      expect(mocks.load).toHaveBeenCalledWith(
        {
          filename: "file-mid.mp4",
          uri: `path/to/file-mid.mp4`,
          duration: 630000,
          modificationTime: 1597449600000,
        },
        {
          primaryOptions: {
            isLooping: false,
          },
          secondaryOptions: {
            isMuted: true,
            isLooping: false,
          },
        }
      );
      expect(mocks.play).toHaveBeenCalledTimes(2);

      // Confirm the ad is not shown again
      expect(showAdAsync).toHaveBeenCalledTimes(1);
    });

    it("Does not remove the video from the playlist if it does not reach the end", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-short.mp4`,
          filename: `file-short.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01").getTime(),
        },
        {
          uri: `path/to/file-mid.mp4`,
          filename: `file-mid.mp4`,
          duration: 630, // 10 minutes 30 seconds
          modificationTime: new Date("2020-08-15").getTime(),
        },
        {
          uri: `path/to/file-long.mp4`,
          filename: `file-long.mp4`,
          duration: 7800, // 2 hours 10 minutes
          modificationTime: new Date("2020-07-23").getTime(),
        },
      ]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm videos are added to a playlist
      await addMultipleVideosToAPlaylist({
        screen,
        videoFileNames: [`file-short.mp4`, `file-mid.mp4`, `file-long.mp4`],
      });

      // Press the start playlist button
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("playlistVideoListView")),
          "Start Playlist"
        )
      );

      // Fire the callback to close the ad
      const fireDidCloseCallback = getInterstitialDidCloseCallback();
      act(fireDidCloseCallback);

      // Confirm the first video is loaded and starts to play
      expect(mocks.load).toHaveBeenCalledTimes(1);
      expect(mocks.play).toHaveBeenCalledTimes(1);

      // Return to the 'select a video' view
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      );

      // Confirm all the videos are still in the playlist
      expect(
        within(screen.getByTestId("playlistVideoListView")).queryAllByTestId(
          "playlistVideoButton"
        )
      ).toHaveLength(3);
    });

    it("Removes the video from the playlist if it finishes playing", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      const { getInterstitialDidCloseCallback } = mockAdMobInterstitial();
      mockMediaLibrary.multipleAssets([
        {
          uri: `path/to/file-short.mp4`,
          filename: `file-short.mp4`,
          duration: 30,
          modificationTime: new Date("2020-09-01").getTime(),
        },
        {
          uri: `path/to/file-mid.mp4`,
          filename: `file-mid.mp4`,
          duration: 630, // 10 minutes 30 seconds
          modificationTime: new Date("2020-08-15").getTime(),
        },
        {
          uri: `path/to/file-long.mp4`,
          filename: `file-long.mp4`,
          duration: 7800, // 2 hours 10 minutes
          modificationTime: new Date("2020-07-23").getTime(),
        },
      ]);

      const screen = await asyncRender(<App />);
      const homeView = screen.queryByTestId("homeView");
      expect(homeView).toBeTruthy();

      const loadViewButton = getButtonByText(
        within(homeView),
        "Select a video to watch"
      );
      expect(loadViewButton).toBeTruthy();

      // Press button to pick a video
      await asyncPressEvent(loadViewButton);

      // Confirm videos are added to a playlist
      await addMultipleVideosToAPlaylist({
        screen,
        videoFileNames: [`file-short.mp4`, `file-mid.mp4`, `file-long.mp4`],
      });

      // Press the start playlist button
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("playlistVideoListView")),
          "Start Playlist"
        )
      );

      // Fire the callback to close the ad
      const fireDidCloseCallback = getInterstitialDidCloseCallback();
      act(fireDidCloseCallback);

      // Confirm the first video is loaded and starts to play
      expect(mocks.load).toHaveBeenCalledTimes(1);
      expect(mocks.play).toHaveBeenCalledTimes(1);

      // Fake the video reaching the end
      mocks.getStatus.mockResolvedValueOnce({
        primaryStatus: { positionMillis: 1000, durationMillis: 1000 },
        secondaryStatus: { positionMillis: 1000, durationMillis: 1000 },
      });
      // Return to normal after identifying the end has been reached
      mocks.getStatus.mockResolvedValue({
        primaryStatus: { positionMillis: 0, durationMillis: 1000 },
        secondaryStatus: { positionMillis: 0, durationMillis: 1000 },
      });

      // Confirm the next video is loaded and starts to play
      silenceAllErrorLogs();
      await waitForExpect(() => expect(mocks.load).toHaveBeenCalledTimes(2));
      enableAllErrorLogs();
      expect(mocks.play).toHaveBeenCalledTimes(2);

      // Return to the 'select a video' view
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "iosArrowBackIcon"
        )
      );

      // Confirm the first the videos has been removed
      const playlistVideos = within(
        screen.getByTestId("playlistVideoListView")
      ).queryAllByTestId("playlistVideoButton");
      expect(playlistVideos).toHaveLength(2);
      expect(
        within(playlistVideos[0]).queryByText(`file-mid.mp4`)
      ).toBeTruthy();
      expect(
        within(playlistVideos[1]).queryByText(`file-long.mp4`)
      ).toBeTruthy();
    });
  });
});

jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");
jest.mock("../secrets.json", () => ({
  bannerAdId: "ca-app-pub-5186020037332344/1196513783",
  videoSelectAdId: "ca-app-pub-5186020037332344/1879040064",
  disableAdsRewardId: "ca-app-pub-5186020037332344/3000550049",
  googleMobileAdsAppId: "ca-app-pub-5186020037332344~5459192428",
  isPayedVersion: true,
}));

import { cleanup, within } from "@testing-library/react-native";
import { AdMobInterstitial } from "expo-ads-admob";
import React from "React";
import { App } from "../App";
import * as asyncStorage from "../src/video-player/async-storage";
import { mockAdMobInterstitial } from "./mocks/mock-ad-mob";
import "./mocks/mock-app-state";
import { mockMediaLibrary } from "./mocks/mock-media-library";
import { mockUseVideoPlayerRefs } from "./mocks/mock-use-video-player-refs";
import { addMultipleVideosToAPlaylist } from "./scenarios/add-multiple-videos-to-a-playlist";
import { startWatchingVideoFromHomeView } from "./scenarios/start-watching-video-from-home-view";
import { startWatchingVideoFromUpperControlBar } from "./scenarios/start-watching-video-from-the upper-control-bar";
import {
  asyncPressEvent,
  asyncRender,
  enableAllErrorLogs,
  getButtonByText,
} from "./test-utils";

describe("Paid version of the app ", () => {
  beforeEach(() => {
    jest.spyOn(asyncStorage.playerMode, "load").mockResolvedValue(undefined);
    jest.spyOn(asyncStorage.resizeMode, "load").mockResolvedValue(undefined);
    jest.clearAllMocks();

    mockMediaLibrary.grantedPermission();
  });

  afterEach(() => {
    cleanup();
    enableAllErrorLogs();
  });

  describe("First opening the app", () => {
    it("Hides the button to view the disable ads view if the app is paid for", async () => {
      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeTruthy();

      const disableAdsButton = getButtonByText(within(homeView), "Disable ads");
      expect(disableAdsButton).not.toBeTruthy();
    });

    it("Hide the banner ad on the home view if the app is paid for", async () => {
      const screen = await asyncRender(<App />);

      // Confirm the current view
      expect(screen.getByTestId("homeView"));

      // Check ad banner is visible
      expect(screen.queryByTestId("bannerAd")).not.toBeTruthy();
    });
  });

  describe("Opening a video from the home view", () => {
    it("Does not open an interstitial ad when the 'load a video' button is press if the app is paid for", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file");

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeTruthy();

      // Start watching a video
      await startWatchingVideoFromHomeView({
        screen,
        videoPlayerMocks: mocks,
        mockVideoFilepath: "path/to/file",
      });

      // Never sets the unit ad id
      expect(AdMobInterstitial.setAdUnitID).not.toHaveBeenCalled();

      // Never request an ad
      expect(AdMobInterstitial.requestAdAsync).not.toHaveBeenCalled();

      // Does not show an ad
      expect(AdMobInterstitial.showAdAsync).not.toHaveBeenCalled();
    });
  });

  describe("Opening a video from the upper control bar", () => {
    it("Does not show an interstitial ad when opening a video if the app is paid for", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file");

      const screen = await asyncRender(<App />);

      await startWatchingVideoFromUpperControlBar({
        screen,
        videoPlayerMocks: mocks,
        mockVideoFilepath: "path/to/file",
      });

      // Does not set the unit ad id
      expect(AdMobInterstitial.setAdUnitID).not.toHaveBeenCalled();

      // Does not request an ad
      expect(AdMobInterstitial.requestAdAsync).not.toHaveBeenCalled();

      // Shows an ad
      expect(AdMobInterstitial.showAdAsync).not.toHaveBeenCalledTimes(1);
    });
  });

  describe("watching a playlist from the home view", () => {
    it("Does not open an interstitial ad when starting to watch a playlist if the app is paid for", async () => {
      mockUseVideoPlayerRefs();
      mockAdMobInterstitial();
      mockMediaLibrary.singleAsset("path/to/file");

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

      // Add videos to a playlist
      await addMultipleVideosToAPlaylist({
        screen,
        videoFileNames: ["path/to/file"],
      });

      // Press the start playlist button
      await asyncPressEvent(
        getButtonByText(
          within(screen.getByTestId("playlistVideoListView")),
          "Start Playlist"
        )
      );

      // Never sets the unit ad id
      expect(AdMobInterstitial.setAdUnitID).not.toHaveBeenCalled();

      // Never request an ad
      expect(AdMobInterstitial.requestAdAsync).not.toHaveBeenCalled();

      // Does not show an ad
      expect(AdMobInterstitial.showAdAsync).not.toHaveBeenCalled();
    });
  });
});

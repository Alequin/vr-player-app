jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");
jest.genMockFromModule("expo-ads-admob");
jest.genMockFromModule("expo-document-picker");
jest.genMockFromModule("expo-av");

import { cleanup, within } from "@testing-library/react-native";
import * as DocumentPicker from "expo-document-picker";
import React from "React";
import waitForExpect from "wait-for-expect";
import { App } from "../App";
import {
  asyncPressEvent,
  asyncRender,
  getButtonByText,
} from "../common-test-utils";
import { mockUseVideoPlayerRefs } from "./mock-use-video-player-refs";

describe("App - Home view", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(cleanup);

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
});

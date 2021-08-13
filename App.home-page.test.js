jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");

import { within, cleanup } from "@testing-library/react-native";
import React from "React";
import { App } from "./App";
import {
  asyncRender,
  getButtonByText,
  getButtonByIconTestId,
} from "./test-utils";

describe("App - Home page", () => {
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

  it("Shows a button to view the disable ads view", async () => {
    const screen = await asyncRender(<App />);
    const homeView = screen.getByTestId("homeView");
    expect(homeView).toBeDefined();

    const disableAdsButton = getButtonByText(within(homeView), "Disable ads");

    expect(disableAdsButton).toBeDefined();
    expect(within(disableAdsButton).getByTestId("cancelIcon")).toBeDefined();
  });

  it("Disables all lower bar controls while on the home page", async () => {
    const screen = await asyncRender(<App />);
    const lowerControlBar = screen.getByTestId("lowerControlBar");
    expect(lowerControlBar).toBeDefined();

    const playButton = getButtonByIconTestId(
      within(lowerControlBar),
      "playIcon"
    );
    expect(playButton.props.accessibilityRole).toBe("disabledButton");

    const playerTypeButton = getButtonByIconTestId(
      within(lowerControlBar),
      "screenDesktopIcon"
    );
    expect(playerTypeButton.props.accessibilityRole).toBe("disabledButton");

    const screenStretchIcon = getButtonByIconTestId(
      within(lowerControlBar),
      "screenNormalIcon"
    );
    expect(screenStretchIcon.props.accessibilityRole).toBe("disabledButton");

    const timeBar = within(lowerControlBar).getByTestId("timeBar");
    expect(timeBar.props.disabled).toBe(true);
  });
});

jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");

import { within, cleanup } from "@testing-library/react-native";
import React from "React";
import { App } from "./App";
import {
  asyncRender,
  getButtonByText,
  getButtonByChildTestId,
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
    expect(timeBar.props.disabled).toBe(true);
  });

  it("Disables all side bar controls while on the home page", async () => {
    const screen = await asyncRender(<App />);
    const sideBarLeft = screen.getByTestId("sidebarLeft");
    expect(sideBarLeft).toBeDefined();

    const replaySidebarButton = getButtonByChildTestId(
      within(sideBarLeft),
      "replay10Icon"
    );
    expect(replaySidebarButton.props.testID).toBe("disabledButton");

    const sideBarRight = screen.getByTestId("sidebarRight");
    expect(sideBarRight).toBeDefined();
    const forwardSidebarButton = getButtonByChildTestId(
      within(sideBarRight),
      "forward10Icon"
    );
    expect(forwardSidebarButton.props.testID).toBe("disabledButton");
  });

  it("Disables the back button while on the home page", async () => {
    const screen = await asyncRender(<App />);
    const upperControlBar = screen.getByTestId("upperControlBar");
    expect(upperControlBar).toBeDefined();

    const backButton = getButtonByChildTestId(
      within(upperControlBar),
      "iosArrowBackIcon"
    );

    expect(backButton.props.testID).toBe("disabledButton");
  });
});

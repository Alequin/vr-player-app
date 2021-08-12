jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");

import { within } from "@testing-library/react-native";
import React from "React";
import { App } from "./App";
import { asyncRender, getButtonByText } from "./test-utils";

describe("App - Home view", () => {
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

    const loadViewButton = getButtonByText(within(homeView), "Disable ads");

    expect(loadViewButton).toBeDefined();
    expect(within(loadViewButton).getByTestId("cancelIcon")).toBeDefined();
  });
});

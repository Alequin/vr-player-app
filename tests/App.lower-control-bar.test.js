jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");

import { cleanup, within } from "@testing-library/react-native";
import React from "React";
import { App } from "../App";
import { asyncRender, getButtonByChildTestId } from "./common-test-utils";

describe("App - Lower control bar", () => {
  afterEach(cleanup);

  it("Disables all lower bar controls while on the home page", async () => {
    const screen = await asyncRender(<App />);

    // Confirm the view we are on
    expect(screen.getByTestId("homeView")).toBeDefined();

    // Confirm all buttons are disabled
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
});

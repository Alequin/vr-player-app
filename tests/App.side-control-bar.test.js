jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");

import { cleanup, within } from "@testing-library/react-native";
import React from "React";
import { App } from "../App";
import { asyncRender, getButtonByChildTestId } from "../common-test-utils";

describe("App - Side control bar", () => {
  afterEach(cleanup);

  it("Disables all side bar controls while on the home page", async () => {
    const screen = await asyncRender(<App />);

    // Confirm the view we are on
    expect(screen.getByTestId("homeView")).toBeDefined();

    // Confirm buttons are disabled
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
});

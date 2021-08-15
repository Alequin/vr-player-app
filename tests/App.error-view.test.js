jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");

import { within } from "@testing-library/react-native";
import React from "React";
import { App } from "../App";
import { asyncRender, getButtonByText } from "./common-test-utils";
import { mockLogError } from "./mocks/mock-logger";
import { mockUseVideoPlayerRefs } from "./mocks/mock-use-video-player-refs";
import { goToErrorViewAfterFailToLoadFromHomePage } from "./scenarios/go-to-error-view-after-fail-to-load-from-home-page";

describe("App - Error view", () => {
  let logErrorMock = mockLogError();

  beforeEach(() => {
    // Silence custom logs for error related tests
    logErrorMock.mockImplementation(() => {});
  });

  afterAll(() => {
    logErrorMock.mockReset();
  });

  it("Shows the expected message", async () => {
    const { mocks } = mockUseVideoPlayerRefs();

    const screen = await asyncRender(<App />);

    await goToErrorViewAfterFailToLoadFromHomePage({
      screen,
      videoPlayerMocks: mocks,
      mockVideoFilepath: "./fake/file/path.jpeg",
    });
    const errorView = screen.getByTestId("errorView");

    expect(
      within(errorView).getByText("Sorry, there was an issue playing the video")
    );
    expect(
      within(errorView).getByText(
        `Unable to play ./fake/file/path.jpeg as a video`
      )
    );
  });

  it("Shows a button to attempt open a new video", async () => {
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

    expect(loadViewButton).toBeDefined();
    expect(within(loadViewButton).getByTestId("folderVideoIcon")).toBeDefined();
  });
});

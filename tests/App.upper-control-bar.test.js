jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");

import { cleanup, within } from "@testing-library/react-native";
import * as DocumentPicker from "expo-document-picker";
import React from "React";
import waitForExpect from "wait-for-expect";
import { App } from "../App";
import {
  asyncPressEvent,
  asyncRender,
  getButtonByChildTestId,
} from "./common-test-utils";
import { mockDocumentPicker } from "./mocks/mock-document-picker";
import { mockLogError } from "./mocks/mock-logger";
import { mockUseVideoPlayerRefs } from "./mocks/mock-use-video-player-refs";

describe("App - Upper control bar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(cleanup);

  it("Disables the back button while on the home page", async () => {
    const screen = await asyncRender(<App />);

    // Confirm the view we are on
    expect(screen.getByTestId("homeView")).toBeDefined();

    const upperControlBar = screen.getByTestId("upperControlBar");
    expect(upperControlBar).toBeDefined();

    const backButton = getButtonByChildTestId(
      within(upperControlBar),
      "iosArrowBackIcon"
    );

    expect(backButton.props.testID).toBe("disabledButton");
  });

  it("Opens the document viewer when the 'load a video' button is press", async () => {
    mockUseVideoPlayerRefs();

    jest
      .spyOn(DocumentPicker, "getDocumentAsync")
      .mockResolvedValue({ type: "cancel" });

    const screen = await asyncRender(<App />);

    const upperControlBar = screen.getByTestId("upperControlBar");
    expect(upperControlBar).toBeDefined();

    const loadViewButton = getButtonByChildTestId(
      within(upperControlBar),
      "folderVideoIcon"
    );
    expect(loadViewButton).toBeDefined();

    // Press button to pick a video
    await asyncPressEvent(loadViewButton);

    // Confirm document picker is opened
    await waitForExpect(() =>
      expect(DocumentPicker.getDocumentAsync).toHaveBeenCalled()
    );
  });

  describe("Upper control bar - directed to error page", () => {
    let logErrorMock = mockLogError();

    beforeEach(() => {
      // Silence custom logs for error related tests
      logErrorMock.mockImplementation(() => {});
    });

    afterAll(() => {
      logErrorMock.mockReset();
    });

    it("Shows the error page when attempting to open a video but there is an issue unloading the previous video", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockDocumentPicker.returnWithASelectedFile();

      mocks.unload.mockRejectedValue(null);

      const screen = await asyncRender(<App />);
      const homeView = screen.getByTestId("homeView");
      expect(homeView).toBeDefined();

      // Pick a new video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      );

      // Pick another video as unload is only called if we have a video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      );

      // Check the error page is shown due to the error
      const errorView = screen.getByTestId("errorView");
      expect(errorView).toBeDefined();
    });

    it("Shows the error page when attempting to open a video from the upper control bar but there is an issue loading the new video", async () => {
      const { mocks } = mockUseVideoPlayerRefs();
      mockDocumentPicker.returnWithASelectedFile();

      mocks.load.mockRejectedValue(null);

      const screen = await asyncRender(<App />);

      // Pick a new video
      await asyncPressEvent(
        getButtonByChildTestId(
          within(screen.getByTestId("upperControlBar")),
          "folderVideoIcon"
        )
      );

      // Check the error page is shown due to the error
      const errorView = screen.getByTestId("errorView");
      expect(errorView).toBeDefined();
    });
  });
});

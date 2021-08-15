jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");
jest.genMockFromModule("expo-av");

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
});

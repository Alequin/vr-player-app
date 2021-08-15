jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");

import { within } from "@testing-library/react-native";
import React from "React";
import { App } from "../App";
import {
  asyncPressEvent,
  asyncRender,
  getButtonByText,
} from "./common-test-utils";
import { mockDocumentPicker } from "./mocks/mock-document-picker";
import { mockUseVideoPlayerRefs } from "./mocks/mock-use-video-player-refs";

describe("App - Error view", () => {
  it.todo("write tests");
});

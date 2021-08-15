jest.mock("react-native/Libraries/Animated/src/NativeAnimatedHelper");

import { cleanup } from "@testing-library/react-native";

describe("App - Home view", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it.todo("plays video when on is selected");
});

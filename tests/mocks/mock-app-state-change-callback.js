jest.mock("react-native/Libraries/AppState/AppState", () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  currentState: "active",
}));
import { AppState } from "react-native";

export const mockAppStateChangeCallback = () => {
  let capturedCallback = null;
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((eventName, callback) => {
      if (eventName === "change") capturedCallback = callback;
    });

  return () => capturedCallback;
};

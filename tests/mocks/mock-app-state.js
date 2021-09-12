jest.mock("react-native/Libraries/AppState/AppState", () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  currentState: "active",
}));

import { act } from "@testing-library/react-native";
import findKey from "lodash/findKey";
import uniqueId from "lodash/uniqueId";
import { AppState } from "react-native";

export const mockAppStateUpdate = () => {
  const capturedCallbacks = {};
  jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((eventName, callback) => {
      if (eventName === "change") capturedCallbacks[uniqueId()] = callback;
    });

  jest
    .spyOn(AppState, "removeEventListener")
    .mockImplementation((eventName, callback) => {
      if (eventName === "change") {
        const callbackToRemove = findKey(
          capturedCallbacks,
          (capturedCallback) => capturedCallback === callback
        );
        delete capturedCallbacks[callbackToRemove];
      }
    });

  return async (nextAppState) => {
    for (const callback of Object.values(capturedCallbacks)) {
      await act(async () => callback(nextAppState));
    }
  };
};

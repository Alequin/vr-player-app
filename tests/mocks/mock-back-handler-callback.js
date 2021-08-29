jest.mock("react-native/Libraries/Utilities/BackHandler.android");
import { BackHandler } from "react-native";

export const mockBackHandlerCallback = () => {
  let capturedCallback = null;
  jest
    .spyOn(BackHandler, "addEventListener")
    .mockImplementation((eventName, callback) => {
      if (eventName === "hardwareBackPress") capturedCallback = callback;

      return {
        remove: () => {},
      };
    });
  return () => capturedCallback;
};

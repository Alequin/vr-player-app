import { ToastAndroid } from "react-native";

export const showWarningMessage = (message) => ToastAndroid.show(message, 3000);

export const showErrorMessage = (message) =>
  ToastAndroid.show(`Sorry, ${message}. Please try again`, 3000);

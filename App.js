import { StatusBar } from "expo-status-bar";
import React from "react";
import "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { VideoPlayer } from "./src/video-player/video-player";

export const App = () => (
  <>
    <StatusBar hidden />
    <VideoPlayer />
  </>
);

const AppWithSafeArea = () => (
  <SafeAreaProvider>
    <App />
  </SafeAreaProvider>
);

export default AppWithSafeArea;

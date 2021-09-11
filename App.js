import { StatusBar } from "expo-status-bar";
import React, { useState, useCallback, useEffect } from "react";
import "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BlankScreen } from "./src/blank-screen";
import { VideoPlayer } from "./src/video-player/video-player";

export const App = () => {
  const { shouldResetApp, markAppForReset } = useResetApp();

  return (
    <>
      <StatusBar hidden />
      {/* In case of errors which are difficult to recover from fail fast & reset by unrounding and remounting all components */}
      {shouldResetApp ? (
        <BlankScreen />
      ) : (
        <VideoPlayer resetApp={markAppForReset} />
      )}
    </>
  );
};

const useResetApp = () => {
  const [shouldResetApp, setShouldResetApp] = useState(false);

  useEffect(() => {
    if (shouldResetApp) {
      const timeout = setTimeout(() => {
        setShouldResetApp(false);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [shouldResetApp]);

  return {
    shouldResetApp,
    markAppForReset: useCallback(() => setShouldResetApp(true), []),
  };
};

const AppWithSafeArea = () => (
  <SafeAreaProvider>
    <App />
  </SafeAreaProvider>
);

export default AppWithSafeArea;

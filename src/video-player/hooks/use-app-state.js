import { useEffect, useState } from "react";
import { AppState } from "react-native";

export const useAppState = () => {
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const updateAppState = (nextAppState) => setAppState(nextAppState);
    AppState.addEventListener("change", updateAppState);
    return () => AppState.removeEventListener("change", updateAppState);
  }, []);

  return { isAppActive: appState === "active" };
};

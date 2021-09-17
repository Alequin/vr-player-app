import React from "react";
import { ActivityIndicator } from "react-native";

export const LoadingIndicatorView = () => {
  return (
    <ActivityIndicator
      testID="loadingIndicatorView"
      size="large"
      color="#00ff00"
      style={{ flex: 1 }}
    />
  );
};

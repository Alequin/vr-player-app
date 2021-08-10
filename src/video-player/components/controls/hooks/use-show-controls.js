import { useCallback, useEffect, useRef, useState } from "react";
import { Animated } from "react-native";

export const useShowControls = (videoPlayer) => {
  const [areControlsVisible, setAreControlsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showControls = useCallback(() => {
    fadeAnim.setValue(1);
    setAreControlsVisible(true);
  }, [fadeAnim?.current]);

  useEffect(() => {
    if (areControlsVisible && videoPlayer.isPlaying) {
      const timeout = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          setAreControlsVisible(false);
        });
      }, 7000);
      return () => clearTimeout(timeout);
    }
  }, [areControlsVisible, videoPlayer.isPlaying]);

  useEffect(() => {
    if (!videoPlayer.isPlaying) showControls();
  }, [showControls, videoPlayer.isPlaying]);

  return {
    fadeAnim,
    showControls,
  };
};

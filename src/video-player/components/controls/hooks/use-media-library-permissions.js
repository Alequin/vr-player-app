import * as MediaLibrary from "expo-media-library";
import { useCallback, useEffect, useState } from "react";

export const useMediaLibraryPermissions = () => {
  const [mediaLibraryPermissions, setMediaLibraryPermissions] = useState(null);

  useEffect(() => {
    let hasUnmounted = false;
    MediaLibrary.requestPermissionsAsync().then((permissions) => {
      if (hasUnmounted) return;
      setMediaLibraryPermissions(permissions);
    });
    return () => (hasUnmounted = true);
  }, []);

  return {
    isCheckingPermissions: !mediaLibraryPermissions,
    hasPermission: mediaLibraryPermissions?.granted,
    canAskPermissionInApp: mediaLibraryPermissions?.canAskAgain,
    askForMediaLibraryPermission: useCallback(
      () =>
        MediaLibrary.requestPermissionsAsync().then(setMediaLibraryPermissions),
      []
    ),
  };
};

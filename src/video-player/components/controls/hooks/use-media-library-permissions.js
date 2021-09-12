import * as Linking from "expo-linking";
import * as MediaLibrary from "expo-media-library";
import { useCallback, useEffect, useState } from "react";
import { useAppState } from "../../../hooks/use-app-state";

export const useMediaLibraryPermissions = () => {
  const { isAppActive } = useAppState();

  const [mediaLibraryPermissions, setMediaLibraryPermissions] = useState(null);

  useEffect(() => {
    let hasUnmounted = false;
    MediaLibrary.requestPermissionsAsync().then((permissions) => {
      if (hasUnmounted) return;
      setMediaLibraryPermissions(permissions);
    });
    return () => (hasUnmounted = true);
  }, []);

  useEffect(() => {
    if (!isAppActive) return;
    let hasUnmounted = false;

    MediaLibrary.getPermissionsAsync().then(async (permissions) => {
      if (hasUnmounted) return;
      setMediaLibraryPermissions(permissions);
    });

    return () => (hasUnmounted = true);
  }, [isAppActive]);

  const canAskPermissionInApp = mediaLibraryPermissions?.canAskAgain;

  return {
    isCheckingPermissions: !mediaLibraryPermissions,
    hasPermission: mediaLibraryPermissions?.granted,
    canAskPermissionInApp,
    askForMediaLibraryPermission: useCallback(
      async () =>
        canAskPermissionInApp
          ? MediaLibrary.requestPermissionsAsync()
          : Linking.openSettings(),

      [canAskPermissionInApp]
    ),
  };
};

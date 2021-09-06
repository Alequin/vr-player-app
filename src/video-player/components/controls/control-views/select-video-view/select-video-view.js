import * as Linking from "expo-linking";
import React, { useEffect } from "react";
import { ActivityIndicator } from "react-native";
import { ListOfVideos } from "./list-of-videos";
import { RequestPermissionsButton } from "./request-permissions-button";
import { useLoadMedia } from "./use-load-media";

export const SelectVideoView = ({
  onSelectVideo,
  videoSortInstructions,
  returnToHomeView,
}) => {
  const {
    videoOptions,
    loadVideoOptions,
    orderVideoOptions,
    mediaLibraryPermissions,
  } = useLoadMedia();

  useEffect(() => {
    loadVideoOptions().then(async () =>
      orderVideoOptions(videoSortInstructions)
    );
  }, []);

  useEffect(() => {
    orderVideoOptions(videoSortInstructions);
  }, [videoSortInstructions, Boolean(videoOptions)]);

  if (mediaLibraryPermissions && !mediaLibraryPermissions.granted)
    return (
      <RequestPermissionsButton
        testID="selectVideoViewNeedPermission"
        shouldDirectUserToSettings={!mediaLibraryPermissions.canAskAgain}
        onPress={async () => {
          if (mediaLibraryPermissions.canAskAgain) await loadVideoOptions();
          else {
            returnToHomeView();
            await Linking.openSettings();
          }
        }}
      />
    );

  if (!videoOptions)
    return (
      <ActivityIndicator
        testID="selectVideoViewLoading"
        size="large"
        color="#00ff00"
        style={{ height: "100%" }}
      />
    );

  return (
    <ListOfVideos videoOptions={videoOptions} onSelectVideo={onSelectVideo} />
  );
};

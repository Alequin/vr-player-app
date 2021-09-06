import * as MediaLibrary from "expo-media-library";
import orderBy from "lodash/orderBy";
import { useCallback, useState } from "react";

export const useLoadMedia = () => {
  const [videoOptions, setVideoOptions] = useState(null);
  const [mediaLibraryPermissions, setMediaLibraryPermissions] = useState(null);

  return {
    videoOptions,
    mediaLibraryPermissions,
    loadVideoOptions: useCallback(async () => {
      const permissions = await MediaLibrary.requestPermissionsAsync();
      setMediaLibraryPermissions(permissions);

      if (permissions.status !== "granted") return null;

      const videos = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.video,
        sortBy: MediaLibrary.SortBy.modificationTime,
      });

      setVideoOptions(
        videos.assets.map((asset) => ({
          ...asset,
          // Fix loading issues with uri's that include '#'
          uri: asset.uri.replace("#", "%23"),
        }))
      );
    }, []),
    orderVideoOptions: useCallback((videoSortInstructions) => {
      setVideoOptions(
        (videoOptions) =>
          videoOptions &&
          orderBy(
            videoOptions,
            videoSortInstructions.key,
            videoSortInstructions.order
          )
      );
    }, []),
  };
};

import * as MediaLibrary from "expo-media-library";
import orderBy from "lodash/orderBy";
import { useEffect, useState, useCallback } from "react";

export const useLoadMedia = (videoSortInstructions) => {
  const [videoOptions, setVideoOptions] = useState(null);

  const [mediaLibraryPermissions, setMediaLibraryPermissions] = useState(null);

  useOrderVideoOptions(setVideoOptions, videoOptions, videoSortInstructions);

  useEffect(() => {
    if (videoOptions) return;

    let hasUnmounted = false;
    MediaLibrary.requestPermissionsAsync().then(async (permissions) => {
      if (hasUnmounted) return;
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
    });
    return () => (hasUnmounted = true);
  }, [videoOptions]);

  return {
    videoOptions,
    mediaLibraryPermissions,
    refreshVideoOptions: useCallback(() => setVideoOptions(false), []),
  };
};

const useOrderVideoOptions = (
  setVideoOptions,
  videoOptions,
  videoSortInstructions
) =>
  useEffect(() => {
    setVideoOptions(
      (videoOptions) =>
        videoOptions &&
        videoSortInstructions &&
        orderBy(
          videoOptions,
          videoSortInstructions.key,
          videoSortInstructions.order
        )
    );
  }, [
    Boolean(videoOptions),
    videoSortInstructions?.key,
    videoSortInstructions?.order,
  ]);

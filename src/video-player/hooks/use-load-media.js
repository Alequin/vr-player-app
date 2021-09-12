import * as MediaLibrary from "expo-media-library";
import orderBy from "lodash/orderBy";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "./use-app-state";

export const useLoadMedia = (hasPermission, videoSortInstructions) => {
  const { isAppActive } = useAppState();
  const [videoOptions, setVideoOptions] = useState(null);

  useEffect(() => {
    if (!hasPermission || !isAppActive) return;

    let hasUnmounted = false;
    MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.video,
      first: 100000,
    }).then(async (videos) => {
      if (hasUnmounted) return;

      setVideoOptions(
        videos.assets.map((asset) => ({
          ...asset,
          // Fix loading issues with uri's that include '#'
          uri: asset.uri.replace("#", "%23"),
        }))
      );
    });
    return () => (hasUnmounted = true);
  }, [hasPermission, isAppActive]);

  return useMemo(
    () =>
      videoOptions
        ? orderBy(
            videoOptions,
            videoSortInstructions.key,
            videoSortInstructions.order
          )
        : null,
    [videoOptions, videoSortInstructions?.key, videoSortInstructions?.order]
  );
};

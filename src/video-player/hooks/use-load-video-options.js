import * as MediaLibrary from "expo-media-library";
import orderBy from "lodash/orderBy";
import { useEffect, useMemo, useState } from "react";
import { useCallback } from "react/cjs/react.development";
import { useAppState } from "./use-app-state";

export const useLoadVideoOptions = (hasPermission, videoSortInstructions) => {
  const { isAppActive } = useAppState();
  const [videoOptions, setVideoOptions] = useState(null);

  useEffect(() => {
    if (!hasPermission || !isAppActive) return;

    let hasUnmounted = false;
    getVideoOptions().then(async (nextVideoOptions) => {
      if (hasUnmounted) return;
      setVideoOptions(nextVideoOptions);
    });
    return () => (hasUnmounted = true);
  }, [hasPermission, isAppActive]);

  return {
    videoOptions: useMemo(
      () =>
        videoOptions
          ? orderBy(
              videoOptions,
              videoSortInstructions.key,
              videoSortInstructions.order
            )
          : null,
      [videoOptions, videoSortInstructions?.key, videoSortInstructions?.order]
    ),
    reloadVideoOptions: useCallback(
      async () => setVideoOptions(await getVideoOptions()),
      []
    ),
  };
};

const getVideoOptions = async () => encodeVideoUris(await getRawVideoAssets());

const getRawVideoAssets = async () =>
  MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.video,
    first: 100000,
  });

const encodeVideoUris = (videos) => {
  return videos.assets.map((asset) => ({
    ...asset,
    // Fix loading issues with uri's that include '#'
    uri: asset.uri.replace("#", "%23"),
  }));
};

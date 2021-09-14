import * as MediaLibrary from "expo-media-library";
import isError from "lodash/isError";
import orderBy from "lodash/orderBy";
import { useEffect, useMemo, useState, useCallback } from "react";
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
    didLoadingVideoOptionsError: isError(videoOptions),
    reloadVideoOptions: useCallback(async () => {
      setVideoOptions(null);
      setVideoOptions(await getVideoOptions());
    }, []),
  };
};

const getVideoOptions = async () => {
  const videoOptions = await getRawVideoAssets();
  return isError(videoOptions) ? videoOptions : encodeVideoUris(videoOptions);
};

const getRawVideoAssets = async () => {
  try {
    return await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.video,
      first: 100000,
    });
  } catch {
    return new Error("unable to load video options");
  }
};

const encodeVideoUris = (videos) => {
  return videos.assets.map((asset) => ({
    ...asset,
    // Fix loading issues with uri's that include '#'
    uri: asset.uri.replace("#", "%23"),
  }));
};

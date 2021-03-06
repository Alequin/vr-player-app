import * as MediaLibrary from "expo-media-library";
import isEmpty from "lodash/isEmpty";
import orderBy from "lodash/orderBy";
import { useCallback, useEffect, useMemo, useState } from "react";
import { secondsToMilliseconds } from "../../minutes-to-milliseconds";
import { videoThumbnail } from "../video-thumbnail";
import { useAppState } from "./use-app-state";

export const useLoadVideoOptions = (hasPermission, videoSortInstructions) => {
  const { isAppActive } = useAppState();
  const [videoOptions, setVideoOptions] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hasPermission || !isAppActive) return;

    let hasUnmounted = false;
    setVideoOptions(null);
    getRawVideoAssets()
      .then(async (nextVideoOptions) => {
        if (hasUnmounted) return;
        setError(false);
        setVideoOptions(nextVideoOptions);
      })
      .catch(() => {
        if (hasUnmounted) return;
        setError(true);
        setVideoOptions([]);
      });

    return () => (hasUnmounted = true);
  }, [hasPermission, isAppActive]);

  const orderedVideoOptions = useMemo(
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

  useEffect(() => {
    // Incrementally load thumbnails so they slowly appear over time until all video options have one
    const videosToAddThumbnailTo = orderedVideoOptions
      ?.filter(({ thumbnail }) => !thumbnail)
      .slice(0, 2);
    if (isEmpty(videosToAddThumbnailTo)) return;

    let hasUnmounted = false;
    Promise.all(
      orderedVideoOptions.map(async (video) => {
        return videosToAddThumbnailTo.some(({ uri }) => uri === video.uri)
          ? {
              ...video,
              thumbnail: await videoThumbnail(video.uri, video.duration),
            }
          : video;
      })
    ).then((videosWithThumbnails) => {
      if (hasUnmounted) return;
      setVideoOptions(videosWithThumbnails);
    });
    return () => (hasUnmounted = true);
  }, [orderedVideoOptions]);

  return {
    videoOptions: orderedVideoOptions,
    didLoadingVideoOptionsError: error,
    reloadVideoOptions: useCallback(() => {
      setVideoOptions(null);
      getRawVideoAssets()
        .then((nextVideoOptions) => {
          setVideoOptions(nextVideoOptions);
          setError(false);
        })
        .catch(() => {
          setError(true);
          setVideoOptions([]);
        });
    }, []),
  };
};

const getRawVideoAssets = async () => {
  const rawVideos = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.video,
    first: 100000,
  });

  return rawVideos.assets.map((asset) => ({
    ...asset,
    duration: secondsToMilliseconds(asset.duration),
    // Fix loading issues with uri's that include '#'
    uri: asset.uri.replace("#", "%23"),
  }));
};

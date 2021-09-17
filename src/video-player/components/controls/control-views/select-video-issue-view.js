import isEmpty from "lodash/isEmpty";
import React, { useEffect, useState } from "react";
import { ListOfVideosView } from "./list-of-videos-view";
import { LoadingIndicatorView } from "./loading-indicator-view";
import { SingleButtonView } from "./single-button-view";

export const SelectVideoView = ({
  videoOptions,
  didLoadingVideoOptionsError,
  onSelectVideo,
  onPressReloadVideoOptions,
}) => {
  if (useIsLoading(videoOptions, didLoadingVideoOptionsError))
    return <LoadingIndicatorView />;

  if (didLoadingVideoOptionsError)
    return (
      <SingleButtonView
        testID="errorLoadingVideoOptionsView"
        onPress={onPressReloadVideoOptions}
        bodyText={
          "Sorry, there was an issue while looking for videos to play.\n\nReload to try again."
        }
        iconName="refresh"
        iconText="Reload video files"
      />
    );

  if (isEmpty(videoOptions))
    return (
      <SingleButtonView
        testID="noVideoOptionsView"
        onPress={onPressReloadVideoOptions}
        bodyText={
          "Cannot find any videos to play.\n\nMove some onto your device to watch them in VR."
        }
        iconName="refresh"
        iconText="Reload video files"
      />
    );

  return (
    <ListOfVideosView
      videoOptions={videoOptions}
      onSelectVideo={onSelectVideo}
    />
  );
};

const useIsLoading = (videoOptions, didLoadingVideoOptionsError) => {
  const [shouldFakeLoading, setShouldFakeLoading] = useState(false);

  useEffect(() => {
    setShouldFakeLoading(false);
    if (isEmpty(videoOptions) || didLoadingVideoOptionsError) {
      setShouldFakeLoading(true);
      const timeout = setTimeout(() => setShouldFakeLoading(false), 500);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [videoOptions, didLoadingVideoOptionsError]);

  return !videoOptions || shouldFakeLoading;
};

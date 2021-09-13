import { isEmpty } from "lodash";
import React, { useState } from "react";
import { useEffect } from "react/cjs/react.development";
import { ListOfVideosView } from "./list-of-videos-view";
import { LoadingIndicatorView } from "./loading-indicator-view";
import { SingleButtonView } from "./single-button-view";

export const SelectVideoView = ({
  videoOptions,
  onSelectVideo,
  onPressReloadVideoOptions,
}) => {
  const isLoading = useIsLoading(videoOptions);

  if (isLoading) return <LoadingIndicatorView />;

  return isEmpty(videoOptions) ? (
    <SingleButtonView
      testID="noVideoOptionsView"
      onPress={onPressReloadVideoOptions}
      bodyText={
        "Cannot find any videos to play.\n\nMove some onto your device to watch them in VR."
      }
      iconName="refresh"
      iconText="Reload video files"
    />
  ) : (
    <ListOfVideosView
      videoOptions={videoOptions}
      onSelectVideo={onSelectVideo}
    />
  );
};

const useIsLoading = (videoOptions) => {
  const [shouldFakeLoading, setShouldFakeLoading] = useState(false);

  useEffect(() => {
    if (isEmpty(videoOptions)) {
      setShouldFakeLoading(true);
      const timeout = setTimeout(() => setShouldFakeLoading(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [videoOptions]);

  return !videoOptions || shouldFakeLoading;
};

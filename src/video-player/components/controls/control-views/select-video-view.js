import React from "react";
import { ListOfVideosView } from "./list-of-videos-view";
import { LoadingIndicatorView } from "./loading-indicator-view";

export const SelectVideoView = ({ videoOptions, onSelectVideo }) => {
  if (!videoOptions) return <LoadingIndicatorView />;

  return (
    <ListOfVideosView
      videoOptions={videoOptions}
      onSelectVideo={onSelectVideo}
    />
  );
};

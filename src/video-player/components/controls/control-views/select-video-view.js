import isEmpty from "lodash/isEmpty";
import React, { useEffect, useState } from "react";
import { Dimensions, View } from "react-native";
import { ListOfVideosView } from "./list-of-videos-view";
import { LoadingIndicatorView } from "./loading-indicator-view";
import { PlaylistView } from "./playlist-view";
import { SingleButtonView } from "./single-button-view";

const SMALL_SCREEN_WIDTH = 480;

const windowWidth = Dimensions.get("window").width;
const COLUMN_COUNT = windowWidth > SMALL_SCREEN_WIDTH ? 2 : 1;
const PLAYLIST_COLUMN_COUNT = windowWidth * 0.7 > SMALL_SCREEN_WIDTH ? 2 : 1;

export const SelectVideoView = ({
  videoOptions,
  didLoadingVideoOptionsError,
  onPressReloadVideoOptions,
  isPlaylistActive,
  loadVideoSource,
  videosInPlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  moveVideoPositionUp,
  moveVideoPositionDown,
  loadNextPlaylistVideo,
}) => {
  if (useIsLoading(videoOptions)) return <LoadingIndicatorView />;

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

  if (isPlaylistActive)
    return (
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          flex: 1,
        }}
      >
        <ListOfVideosView
          key="listOfVideosForPlaylist"
          style={{
            flex: 7,
          }}
          columnCount={PLAYLIST_COLUMN_COUNT}
          videoOptions={videoOptions}
          onSelectVideo={addVideoToPlaylist}
        />
        <Divider />
        <PlaylistView
          style={{ flex: 3, maxHeight: "100%" }}
          videosInPlaylist={videosInPlaylist}
          onRemoveVideoFromPlaylist={removeVideoFromPlaylist}
          onMoveVideoPositionUp={moveVideoPositionUp}
          onMoveVideoPositionDown={moveVideoPositionDown}
          onStartPlaylist={loadNextPlaylistVideo}
        />
      </View>
    );

  return (
    <View
      style={{
        width: "100%",
        flexDirection: "row",
        flex: 1,
      }}
    >
      <ListOfVideosView
        key="listOfVideosForSingle"
        style={{
          width: "100%",
        }}
        columnCount={COLUMN_COUNT}
        videoOptions={videoOptions}
        onSelectVideo={loadVideoSource}
      />
    </View>
  );
};

const Divider = () => (
  <View
    style={{ height: "100%", width: 1, backgroundColor: "gray", margin: 2 }}
  />
);

const useIsLoading = (videoOptions) => {
  const [shouldFakeLoading, setShouldFakeLoading] = useState(false);

  useEffect(() => {
    setShouldFakeLoading(false);
    if (videoOptions && isEmpty(videoOptions)) {
      setShouldFakeLoading(true);
      const timeout = setTimeout(() => setShouldFakeLoading(false), 500);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [videoOptions]);

  return !videoOptions || shouldFakeLoading;
};

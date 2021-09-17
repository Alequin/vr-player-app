import { isEmpty } from "lodash";
import React, { useRef, useState } from "react";
import { FlatList, View } from "react-native";
import { useEffect } from "react/cjs/react.development";
import { Button } from "../../../../button";
import { ControlViewText } from "./control-view-text";
import { PlaylistButton } from "./video-list-buttons";

export const PlaylistView = ({
  videosInPlaylist,
  onRemoveVideoFromPlaylist,
  style,
  onMoveVideoPositionUp,
  onMoveVideoPositionDown,
  onStartPlaylist,
}) => {
  const listRef = useRef();
  const [hasListRendered, setHasListRendered] = useState(false);
  const [listItemCount, setListItemCount] = useState(0);

  useEffect(() => {
    if (hasListRendered) {
      const newListItemCount = videosInPlaylist.length;
      if (newListItemCount > listItemCount) listRef?.current?.scrollToEnd();
      setListItemCount(newListItemCount);
      setHasListRendered(false);
    }
  }, [hasListRendered]);

  return (
    <View testID="playlistVideoListView" style={style}>
      <FlatList
        ref={listRef}
        style={{ width: "100%" }}
        data={videosInPlaylist}
        keyExtractor={({ uri }) => uri}
        numColumns={1}
        renderItem={({ item, index }) => {
          const isFirstItem = index === 0;
          const isLastItem = index === videosInPlaylist.length - 1;
          return (
            <PlaylistButton
              video={item}
              onRemoveVideoFromPlaylist={(video) => {
                onRemoveVideoFromPlaylist(video);
                setListItemCount(listItemCount - 1);
              }}
              onMoveVideoPositionUp={
                !isFirstItem ? onMoveVideoPositionUp : undefined
              }
              onMoveVideoPositionDown={
                !isLastItem ? onMoveVideoPositionDown : undefined
              }
              onMount={() => {
                if (isLastItem) setHasListRendered(true);
              }}
            />
          );
        }}
      />
      <Button onPress={onStartPlaylist} disabled={isEmpty(videosInPlaylist)}>
        <ControlViewText>Start Playlist</ControlViewText>
      </Button>
    </View>
  );
};

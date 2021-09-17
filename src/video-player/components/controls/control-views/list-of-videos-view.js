import React from "react";
import { FlatList, View } from "react-native";
import { VideoButton } from "./video-list-buttons";

export const ListOfVideosView = ({
  videoOptions,
  onSelectVideo,
  columnCount,
  style,
}) => {
  return (
    <View testID="selectVideoListView" style={style}>
      <FlatList
        style={{ width: "100%" }}
        data={videoOptions}
        keyExtractor={({ uri }) => uri}
        numColumns={columnCount}
        renderItem={({ item }) => (
          <VideoButton
            video={item}
            onSelectVideo={onSelectVideo}
            columnCount={columnCount}
          />
        )}
      />
    </View>
  );
};

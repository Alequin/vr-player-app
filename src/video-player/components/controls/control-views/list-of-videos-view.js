import * as VideoThumbnails from "expo-video-thumbnails";
import React, { useEffect, useState } from "react";
import { useMemo } from "react";
import { FlatList, Image, useWindowDimensions, View } from "react-native";
import { Button } from "../../../../button";
import { Icon } from "../../../../icon";
import { isAtLeastAnHour } from "../../../../is-at-least-an-hour";
import {
  millisecondsToTime,
  millisecondsToTimeWithoutHours,
} from "../../utils";
import { ControlViewText } from "./control-view-text";

export const ListOfVideosView = ({ videoOptions, onSelectVideo }) => {
  const window = useWindowDimensions();
  // Only check column count once as if it changes it will cause an error
  const columnCount = useMemo(() => (window.width > 480 ? 2 : 1), []);

  return (
    <FlatList
      testID="selectVideoListView"
      style={{ width: "100%" }}
      data={videoOptions}
      keyExtractor={({ uri }) => uri}
      numColumns={columnCount}
      renderItem={({ item }) => (
        <VideoButton
          uri={item.uri}
          thumbnail={item.thumbnail}
          filename={item.filename}
          duration={item.duration}
          modificationTime={item.modificationTime}
          onSelectVideo={onSelectVideo}
          columnCount={columnCount}
        />
      )}
    />
  );
};

const VideoButton = ({
  uri,
  thumbnail,
  filename,
  duration,
  modificationTime,
  onSelectVideo,
  columnCount,
}) => {
  return (
    <View
      testID="videoButton"
      style={{
        width: columnCount === 1 ? "100%" : "50%",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Button
        onPress={() => onSelectVideo({ uri, filename })}
        style={{
          width: "97.5%",
          borderWidth: 1,
          borderColor: "gray",
          backgroundColor: "#ffffff17",
          borderRadius: 10,
          padding: 10,
          marginBottom: 10,
          flexDirection: "row",
        }}
      >
        {thumbnail ? (
          <Image
            source={{ uri: thumbnail }}
            style={{ flex: 25 }}
            testID={`${filename}Thumbnail`}
          />
        ) : (
          <View
            style={{ flex: 25, justifyContent: "center", alignItems: "center" }}
          >
            <Icon name="video" color="white" size={36} />
          </View>
        )}
        <View style={{ flex: 75, marginLeft: 10 }}>
          <ControlViewText numberOfLines={1}>{filename}</ControlViewText>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              alignItems: "center",
            }}
          >
            <ControlViewText>
              {isAtLeastAnHour(duration)
                ? millisecondsToTime(duration)
                : millisecondsToTimeWithoutHours(duration)}
            </ControlViewText>
            <ControlViewText>
              {videoCreationDate(new Date(modificationTime))}
            </ControlViewText>
          </View>
        </View>
      </Button>
    </View>
  );
};

const useVideoThumbnail = (videoUri, videoDuration) => {
  const [thumbnailUri, setThumbnailUri] = useState(null);

  useEffect(() => {
    let hasUnmounted = false;
    VideoThumbnails.getThumbnailAsync(videoUri, {
      time: videoDuration / 2,
    })
      .then(({ uri }) => {
        if (!hasUnmounted) setThumbnailUri(uri);
      })
      .catch(doNothing); // Default thumbnail is used in case of error so do nothing
    return () => (hasUnmounted = true);
  }, []);

  return thumbnailUri;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

const videoCreationDate = (fileModificationDateObject) => {
  const date = fileModificationDateObject.getDate();
  const month = MONTHS[fileModificationDateObject.getMonth()];
  const year = fileModificationDateObject.getFullYear();
  const currentYear = new Date().getFullYear();

  if (currentYear === year) return `${month} ${date}`;
  return `${month} ${date} ${year}`;
};

const doNothing = () => {};

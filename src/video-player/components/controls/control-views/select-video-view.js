import * as MediaLibrary from "expo-media-library";
import isEmpty from "lodash/isEmpty";
import orderBy from "lodash/orderBy";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { Button } from "../../../../button";
import { Icon } from "../../../../icon";
import { isAtLeastAnHour } from "../../../../is-at-least-an-hour";
import { secondsToMilliseconds } from "../../../../minutes-to-milliseconds";
import {
  millisecondsToTime,
  millisecondsToTimeWithoutHours,
} from "../../utils";
import { ControlViewText } from "./control-view-text";

export const SelectVideoView = ({ onSelectVideo, videoSortInstructions }) => {
  const [videoOptions, setVideoOptions] = useState(null);

  useEffect(() => {
    const loadedVideoOptions = videoOptions
      ? Promise.resolve(videoOptions)
      : MediaLibrary.getPermissionsAsync().then(async (canUseMediaLibrary) => {
          if (!canUseMediaLibrary.granted) {
            await MediaLibrary.requestPermissionsAsync();
          }

          const firstPageOfVideos = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.video,
            sortBy: MediaLibrary.SortBy.modificationTime,
          });

          return firstPageOfVideos.assets.map((asset) => ({
            ...asset,
            // Fix loading issues with uri's that include '#'
            uri: asset.uri.replace("#", "%23"),
          }));
        });

    loadedVideoOptions.then((newVideoOptions) => {
      setVideoOptions(
        orderBy(
          newVideoOptions,
          videoSortInstructions.key,
          videoSortInstructions.order
        )
      );
    });
  }, [videoSortInstructions, isEmpty(videoOptions)]);

  if (!videoOptions)
    return (
      <ActivityIndicator
        testID="selectVideoViewLoading"
        size="large"
        color="#00ff00"
        style={{ height: "100%" }}
      />
    );

  return (
    <FlatList
      testID="selectVideoView"
      data={videoOptions}
      keyExtractor={({ uri }) => uri}
      numColumns={2}
      renderItem={({ item }) => (
        <VideoButton
          uri={item.uri}
          filename={item.filename}
          durationInSeconds={item.duration}
          modificationTime={item.modificationTime}
          onSelectVideo={onSelectVideo}
        />
      )}
      item
    />
  );
};

const VideoButton = ({
  uri,
  filename,
  durationInSeconds,
  modificationTime,
  onSelectVideo,
}) => {
  const durationInMilliseconds = secondsToMilliseconds(durationInSeconds);

  return (
    <View
      testID="videoButton"
      style={{ width: "50%", justifyContent: "center", alignItems: "center" }}
    >
      <Button
        onPress={() => onSelectVideo({ uri, filename })}
        style={{
          width: "95%",
          borderWidth: 1,
          borderColor: "gray",
          backgroundColor: "#ffffff17",
          borderRadius: 10,
          padding: 10,
          marginBottom: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Icon name="video" size={25} color="white" style={{ margin: 10 }} />
          <ControlViewText numberOfLines={1} style={{ flex: 1 }}>
            {filename}
          </ControlViewText>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
          }}
        >
          <ControlViewText>
            {isAtLeastAnHour(durationInMilliseconds)
              ? millisecondsToTime(durationInMilliseconds)
              : millisecondsToTimeWithoutHours(durationInMilliseconds)}
          </ControlViewText>
          <ControlViewText>
            {videoCreationDate(new Date(modificationTime))}
          </ControlViewText>
        </View>
      </Button>
    </View>
  );
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

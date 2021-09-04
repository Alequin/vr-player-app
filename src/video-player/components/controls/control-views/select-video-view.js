import * as MediaLibrary from "expo-media-library";
import React, { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { Button } from "../../../../button";
import { Icon } from "../../../../icon";
import { isAtLeastAnHour } from "../../../../is-at-least-an-hour";
import { secondsToMilliseconds } from "../../../../minutes-to-milliseconds";
import {
  millisecondsToTime,
  millisecondsToTimeWithoutHours,
} from "../../utils";
import { ControlViewText } from "./control-view-text";

export const SelectVideoView = ({ onSelectVideo }) => {
  const [videoOptions, setVideoOptions] = useState([]);

  useEffect(() => {
    MediaLibrary.getPermissionsAsync().then(async (canUseMediaLibrary) => {
      if (!canUseMediaLibrary.granted) {
        await MediaLibrary.requestPermissionsAsync();
      }

      const firstPageOfVideos = await MediaLibrary.getAssetsAsync({
        mediaType: [MediaLibrary.MediaType.video],
        sortBy: MediaLibrary.SortBy.modificationTime,
      });

      setVideoOptions(
        firstPageOfVideos.assets.map((asset) => ({
          ...asset,
          uri: asset.uri.replace("#", "%23"),
        }))
      );
    });
  }, []);
  return (
    <FlatList
      testID="selectVideoView"
      data={videoOptions}
      keyExtractor={({ uri }) => uri}
      numColumns={2}
      renderItem={({ item }) => (
        <FileButton
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

const FileButton = ({
  uri,
  filename,
  durationInSeconds,
  modificationTime,
  onSelectVideo,
}) => {
  const durationInMilliseconds = secondsToMilliseconds(durationInSeconds);

  return (
    <View
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

  if (currentYear === year) return `${month} ${date} `;
  return `${month} ${date} ${year}`;
};

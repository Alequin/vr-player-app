import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "../../../../button";
import { Icon } from "../../../../icon";
import { isAtLeastAnHour } from "../../../../is-at-least-an-hour";
import { videoThumbnail } from "../../../video-thumbnail";
import {
  millisecondsToTime,
  millisecondsToTimeWithoutHours,
} from "../../utils";
import { ControlViewText } from "./control-view-text";
import { Thumbnail } from "./thumbnail";

export const VideoButton = ({
  video,
  video: {
    uri,
    thumbnail: cachedThumbnail,
    filename,
    duration,
    modificationTime,
  },
  onSelectVideo,
  columnCount,
}) => {
  const [thumbnail, setThumbnail] = useState(null);
  useEffect(() => {
    if (!cachedThumbnail) videoThumbnail(uri, duration).then(setThumbnail);
  }, [cachedThumbnail]);

  const thumbnailToUse = cachedThumbnail || thumbnail;

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
        onPress={() => onSelectVideo(video)}
        style={[
          {
            flexDirection: "row",
          },
          styles.buttonWidth,
          styles.container,
        ]}
      >
        <Thumbnail
          testID={`${filename}Thumbnail`}
          thumbnail={thumbnailToUse}
          style={{ flex: 25 }}
        />
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

export const PlaylistButton = ({
  video,
  onMoveVideoPositionUp,
  onRemoveVideoFromPlaylist,
  onMoveVideoPositionDown,
  onMount,
}) => {
  useEffect(onMount, []);

  return (
    <View
      testID="playlistVideoButton"
      style={{ justifyContent: "center", alignItems: "center", width: "100%" }}
    >
      <View style={[styles.buttonWidth, styles.container]}>
        <ControlViewText numberOfLines={1}>{video.filename}</ControlViewText>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
            width: "100%",
          }}
        >
          <Button
            onPress={() => onMoveVideoPositionUp(video)}
            disabled={!onMoveVideoPositionUp}
          >
            <Icon name="priorityUp" color="white" size={20} />
          </Button>
          <Button onPress={() => onRemoveVideoFromPlaylist(video)}>
            <Icon name="bin" color="white" size={20} />
          </Button>
          <Button
            onPress={() => onMoveVideoPositionDown(video)}
            disabled={!onMoveVideoPositionDown}
          >
            <Icon name="priorityDown" color="white" size={20} />
          </Button>
        </View>
      </View>
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

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "gray",
    backgroundColor: "#ffffff17",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  buttonWidth: {
    width: "97.5%",
  },
});

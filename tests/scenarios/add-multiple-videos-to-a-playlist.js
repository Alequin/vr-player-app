import { within } from "@testing-library/react-native";
import {
  asyncPressEvent,
  getButtonByChildTestId,
  getButtonByText,
} from "../test-utils";

export const addMultipleVideosToAPlaylist = async ({
  screen,
  videoFileNames,
}) => {
  // Confirm we are on the "select a video" page
  expect(screen.queryByTestId("selectVideoListView")).toBeTruthy();

  // Press the button to start making a playlist
  const playlistButton = getButtonByChildTestId(
    within(screen.getByTestId("upperControlBar")),
    "playlistAddIcon"
  );
  expect(playlistButton).toBeTruthy();
  await asyncPressEvent(playlistButton);

  // Confirm the playlist view is visible
  expect(screen.queryByTestId("playlistVideoListView"));

  // Select videos to add to the playlist
  const videoButtons = videoFileNames.map((filename) =>
    getButtonByText(within(screen.getByTestId("selectVideoListView")), filename)
  );

  for (const button of videoButtons) expect(button).toBeTruthy();
  for (const button of videoButtons) await asyncPressEvent(button);

  // Confirm the videos were added to the playlist
  const playlistView = screen.queryByTestId("playlistVideoListView");
  for (const filename of videoFileNames) {
    expect(within(playlistView).queryByText(filename)).toBeTruthy();
  }
};

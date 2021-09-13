import { within } from "@testing-library/react-native";
import { mockMediaLibrary } from "../mocks/mock-media-library";
import { asyncPressEvent, getButtonByText } from "../test-utils";

export const goToErrorViewAfterFailToLoadFromHomePage = async ({
  screen,
  videoPlayerMocks,
  mockVideoFilepath = "path/to/file",
}) => {
  videoPlayerMocks.load.mockRejectedValue(null);

  // Pick a new video
  await asyncPressEvent(
    getButtonByText(
      within(screen.getByTestId("homeView")),
      "Select a video to watch"
    )
  );

  // Confirm we are taken to the "select a video" page
  expect(screen.getByTestId("selectVideoListView")).toBeTruthy();

  // Select the first video option
  await asyncPressEvent(
    getButtonByText(
      within(screen.getByTestId("selectVideoListView")),
      mockVideoFilepath
    )
  );

  // Check the error page is shown due to the error
  const errorView = screen.getByTestId("errorView");
  expect(errorView).toBeTruthy();
};

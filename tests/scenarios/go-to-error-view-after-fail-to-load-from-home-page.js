import { within } from "@testing-library/react-native";
import { asyncPressEvent, getButtonByText } from "../test-utils";
import { mockDocumentPicker } from "../mocks/mock-document-picker";

export const goToErrorViewAfterFailToLoadFromHomePage = async ({
  screen,
  videoPlayerMocks,
  mockVideoFilepath,
}) => {
  mockDocumentPicker.returnWithASelectedFile(mockVideoFilepath);
  videoPlayerMocks.load.mockRejectedValue(null);

  // Pick a new video
  await asyncPressEvent(
    getButtonByText(
      within(screen.getByTestId("homeView")),
      "Select a video to watch"
    )
  );

  // Check the error page is shown due to the error
  const errorView = screen.getByTestId("errorView");
  expect(errorView).toBeDefined();
};

import {
  act,
  fireEvent,
  render,
  waitFor,
  within,
} from "@testing-library/react-native";

export const asyncRender = async (component) =>
  waitFor(() => render(component));

export const asyncPressEvent = async (button) => {
  expect(button).toBeTruthy();
  await act(async () => fireEvent.press(button));
};

export const getButtonByText = (screen, innerText) => {
  const buttons = screen.getAllByRole("button");
  return buttons.find((button) => within(button).queryByText(innerText));
};

export const getButtonByChildTestId = (screen, childTestId) => {
  const buttons = screen.getAllByRole("button");
  return buttons.find((button) => within(button).queryByTestId(childTestId));
};

export const videoPlayerProps = (videoPlayerComponent) =>
  videoPlayerComponent.parent.parent.parent.parent.parent.props;

export const buttonProps = (buttonComponent) =>
  buttonComponent.parent.parent.parent.parent.props;

export const getTimeBarProps = (timeBarComponent) =>
  timeBarComponent.parent.parent.props;

// TODO silencing warning logs is not the best. Review for a better solution
export const silenceAllErrorLogs = () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
};

export const enableAllErrorLogs = () => {
  console.error?.mockRestore?.();
};

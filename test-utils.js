import { render, waitFor, within } from "@testing-library/react-native";

export const asyncRender = async (component) =>
  waitFor(() => render(component));

export const getButtonByText = (screen, innerText) => {
  const buttons = screen.getAllByRole("button");
  return buttons.find((button) => within(button).queryByText(innerText));
};

export const getButtonByIconTestId = (screen, iconTestId) => {
  const buttons = screen.queryAllByRole("button");
  const disabledButtons = screen.queryAllByRole("disabledButton");
  return [...buttons, ...disabledButtons].find((button) =>
    within(button).queryByTestId(iconTestId)
  );
};

export const isEnvironmentProduction = () =>
  process.env.NODE_ENV === "production";

export const isEnvironmentTest = () => {
  console.log(process.env.NODE_ENV);
  process.env.NODE_ENV === "production";
};

import * as logger from "../../src/logger";

export const mockLogError = () => jest.spyOn(logger, "logError");

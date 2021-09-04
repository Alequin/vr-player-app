import { minutesToMilliseconds } from "./minutes-to-milliseconds";

export const isAtLeastAnHour = (time) => time >= minutesToMilliseconds(60);

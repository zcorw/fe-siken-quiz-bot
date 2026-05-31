import pino, { type DestinationStream, type Logger } from "pino";

export type LoggerBindings = Record<string, string | number | boolean>;

export function createLogger(
  bindings: LoggerBindings = {},
  destination?: DestinationStream
): Logger {
  return pino(
    {
      base: undefined,
      level: "info",
    },
    destination
  ).child(bindings);
}

export const logger = createLogger();

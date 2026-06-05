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

export interface CreateRuntimeLoggerOptions {
  bindings?: LoggerBindings;
  logFilePath?: string;
  stdout?: DestinationStream;
  syncFile?: boolean;
}

export function createRuntimeLogger({
  bindings = {},
  logFilePath,
  stdout = process.stdout,
  syncFile = false,
}: CreateRuntimeLoggerOptions = {}): Logger {
  const options = {
    base: undefined,
    level: "info",
  };

  if (logFilePath === undefined || logFilePath.trim() === "") {
    return pino(options, stdout).child(bindings);
  }

  return pino(
    options,
    pino.multistream([
      { stream: stdout },
      {
        stream: pino.destination({
          dest: logFilePath,
          mkdir: true,
          sync: syncFile,
        }),
      },
    ])
  ).child(bindings);
}

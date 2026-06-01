import path from "node:path";
import { config } from "dotenv";

export function loadRuntimeEnvFile(cwd = process.cwd()): void {
  config({
    override: false,
    path: path.join(cwd, ".env"),
    quiet: true,
  });
}

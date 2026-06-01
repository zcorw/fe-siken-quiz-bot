/**
 * @vitest-environment node
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadRuntimeEnvFile } from "./load-runtime-env-file";

const originalAppConfigPath = process.env.APP_CONFIG_PATH;
const originalExistingValue = process.env.EXISTING_VALUE;

describe("loadRuntimeEnvFile", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    if (originalAppConfigPath === undefined) {
      delete process.env.APP_CONFIG_PATH;
    } else {
      process.env.APP_CONFIG_PATH = originalAppConfigPath;
    }

    if (originalExistingValue === undefined) {
      delete process.env.EXISTING_VALUE;
    } else {
      process.env.EXISTING_VALUE = originalExistingValue;
    }

    await Promise.all(
      tempDirs
        .splice(0)
        .map((tempDir) => rm(tempDir, { force: true, recursive: true }))
    );
  });

  it("loads local runtime variables from .env without overriding existing environment", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "fe-bot-env-"));
    tempDirs.push(tempDir);
    await writeFile(
      path.join(tempDir, ".env"),
      "APP_CONFIG_PATH=./config/app.yaml\nEXISTING_VALUE=from-file\n",
      "utf8"
    );
    delete process.env.APP_CONFIG_PATH;
    process.env.EXISTING_VALUE = "from-process";

    loadRuntimeEnvFile(tempDir);

    expect(process.env.APP_CONFIG_PATH).toBe("./config/app.yaml");
    expect(process.env.EXISTING_VALUE).toBe("from-process");
  });
});

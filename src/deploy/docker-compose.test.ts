/**
 * @vitest-environment node
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { describe, expect, it } from "vitest";

type ComposeService = {
  user?: string;
};

type ComposeFile = {
  services: Record<string, ComposeService>;
};

describe("deployment docker compose", () => {
  it("runs all app database writers as the deployment user", () => {
    const composePath = path.join(
      process.cwd(),
      "deploy",
      "docker-compose.yml"
    );
    const compose = YAML.parse(
      readFileSync(composePath, "utf8")
    ) as ComposeFile;

    for (const serviceName of ["web", "bot", "migrate"]) {
      expect(compose.services[serviceName]?.user).toBe(
        "${APP_RUN_UID:-1000}:${APP_RUN_GID:-1000}"
      );
    }
  });

  it("exports the deployment uid and gid for docker compose", () => {
    const deployScriptPath = path.join(
      process.cwd(),
      "deploy",
      "scripts",
      "deploy.sh"
    );
    const deployScript = readFileSync(deployScriptPath, "utf8");

    expect(deployScript).toContain('APP_RUN_UID="${APP_RUN_UID:-$(id -u)}"');
    expect(deployScript).toContain('APP_RUN_GID="${APP_RUN_GID:-$(id -g)}"');
    expect(deployScript).toContain("export APP_RUN_UID");
    expect(deployScript).toContain("export APP_RUN_GID");
  });

  it("starts the bot without invoking pnpm at runtime", () => {
    const dockerfilePath = path.join(process.cwd(), "Dockerfile.bot");
    const dockerfile = readFileSync(dockerfilePath, "utf8");

    expect(dockerfile).toContain(
      'CMD ["node", "--import", "tsx", "src/bot/main.ts"]'
    );
    expect(dockerfile).not.toContain('CMD ["pnpm", "bot:start"]');
  });
});

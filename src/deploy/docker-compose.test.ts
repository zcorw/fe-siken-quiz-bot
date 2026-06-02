/**
 * @vitest-environment node
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { describe, expect, it } from "vitest";

type ComposeService = {
  build?: unknown;
  image?: string;
  user?: string;
};

type ComposeFile = {
  services: Record<string, ComposeService>;
};

describe("deployment docker compose", () => {
  it("uses prebuilt GitHub Container Registry images for app services", () => {
    const composePath = path.join(
      process.cwd(),
      "deploy",
      "docker-compose.yml"
    );
    const compose = YAML.parse(
      readFileSync(composePath, "utf8")
    ) as ComposeFile;

    expect(compose.services.web?.image).toBe("${WEB_IMAGE}");
    expect(compose.services.bot?.image).toBe("${BOT_IMAGE}");
    expect(compose.services.migrate?.image).toBe("${MIGRATE_IMAGE}");

    for (const serviceName of ["web", "bot", "migrate"]) {
      expect(compose.services[serviceName]?.build).toBeUndefined();
    }
  });

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

  it("pulls prebuilt images on the VPS instead of building there", () => {
    const deployScriptPath = path.join(
      process.cwd(),
      "deploy",
      "scripts",
      "deploy.sh"
    );
    const deployScript = readFileSync(deployScriptPath, "utf8");

    expect(deployScript).toContain('WEB_IMAGE="${WEB_IMAGE:-');
    expect(deployScript).toContain('BOT_IMAGE="${BOT_IMAGE:-');
    expect(deployScript).toContain('MIGRATE_IMAGE="${MIGRATE_IMAGE:-');
    expect(deployScript).toContain('run_step "pull app images"');
    expect(deployScript).toContain(
      'run_step "start app services" docker compose'
    );
    expect(deployScript).not.toContain("docker compose build");
    expect(deployScript).not.toContain("up -d --build");
  });

  it("builds and pushes deployment images in GitHub Actions", () => {
    const workflowPath = path.join(
      process.cwd(),
      ".github",
      "workflows",
      "deploy.yml"
    );
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("packages: write");
    expect(workflow).toContain("docker/login-action@v3");
    expect(workflow).toContain("docker/build-push-action@v6");
    expect(workflow).toContain("Dockerfile.web");
    expect(workflow).toContain("Dockerfile.bot");
    expect(workflow).toContain("target: builder");
    expect(workflow).toContain("WEB_IMAGE");
    expect(workflow).toContain("BOT_IMAGE");
    expect(workflow).toContain("MIGRATE_IMAGE");
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

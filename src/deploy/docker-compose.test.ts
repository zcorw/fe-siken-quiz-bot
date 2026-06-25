/**
 * @vitest-environment node
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { describe, expect, it } from "vitest";

type ComposeService = {
  build?: {
    context?: string;
    dockerfile?: string;
    target?: string;
  };
  environment?: Record<string, string>;
  image?: string;
  networks?: string[];
  user?: string;
  volumes?: string[];
};

type ComposeFile = {
  networks?: Record<string, { external?: boolean }>;
  services: Record<string, ComposeService>;
};

describe("deployment docker compose", () => {
  it("builds app services locally on the deployment host", () => {
    const composePath = path.join(
      process.cwd(),
      "deploy",
      "docker-compose.yml"
    );
    const compose = YAML.parse(
      readFileSync(composePath, "utf8")
    ) as ComposeFile;

    expect(compose.services.web?.build).toEqual({
      context: "..",
      dockerfile: "Dockerfile.web",
    });
    expect(compose.services.bot?.build).toEqual({
      context: "..",
      dockerfile: "Dockerfile.bot",
    });
    expect(compose.services.migrate?.build).toEqual({
      context: "..",
      dockerfile: "Dockerfile.web",
      target: "builder",
    });

    for (const serviceName of ["web", "bot", "migrate"]) {
      expect(compose.services[serviceName]?.image).toBeUndefined();
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

  it("connects runtime services to the shared question bank network", () => {
    const composePath = path.join(
      process.cwd(),
      "deploy",
      "docker-compose.yml"
    );
    const compose = YAML.parse(
      readFileSync(composePath, "utf8")
    ) as ComposeFile;

    expect(compose.networks?.["fe-shared"]?.external).toBe(true);
    expect(compose.services.edge?.networks).toContain("default");
    expect(compose.services.edge?.networks).toContain("fe-shared");
    expect(compose.services.web?.networks).toContain("default");
    expect(compose.services.web?.networks).toContain("fe-shared");
    expect(compose.services.bot?.networks).toContain("default");
    expect(compose.services.bot?.networks).toContain("fe-shared");
  });

  it("uses the question bank asset proxy without mounting question images", () => {
    const composePath = path.join(
      process.cwd(),
      "deploy",
      "docker-compose.yml"
    );
    const compose = YAML.parse(
      readFileSync(composePath, "utf8")
    ) as ComposeFile;

    expect(compose.services.web?.environment?.QUESTION_BANK_SERVICE_URL).toBe(
      "${QUESTION_BANK_SERVICE_URL:-http://question-bank-runtime:8000}"
    );
    expect(compose.services.bot?.environment?.QUESTION_BANK_SERVICE_URL).toBe(
      "${QUESTION_BANK_SERVICE_URL:-http://question-bank-runtime:8000}"
    );
    for (const serviceName of ["web", "bot"]) {
      const volumes = compose.services[serviceName]?.volumes ?? [];
      expect(volumes.some((volume) => volume.includes("HOST_ASSETS_DIR"))).toBe(
        false
      );
      expect(volumes.some((volume) => volume.includes(":/app/public/assets"))).toBe(
        false
      );
      expect(volumes.some((volume) => volume.includes(":/app/assets"))).toBe(
        false
      );
    }

    const initRuntime = readFileSync(
      path.join(process.cwd(), "deploy", "scripts", "init-runtime.sh"),
      "utf8"
    );
    const deployScript = readFileSync(
      path.join(process.cwd(), "deploy", "scripts", "deploy.sh"),
      "utf8"
    );
    expect(initRuntime).not.toContain("HOST_ASSETS_DIR");
    expect(initRuntime).not.toContain("fe-siken/");
    expect(deployScript).not.toContain("HOST_ASSETS_DIR");
    expect(deployScript).not.toContain("assets dir=");
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

  it("builds app images on the VPS before starting services", () => {
    const deployScriptPath = path.join(
      process.cwd(),
      "deploy",
      "scripts",
      "deploy.sh"
    );
    const deployScript = readFileSync(deployScriptPath, "utf8");

    expect(deployScript).toContain('run_step "build app images"');
    expect(deployScript).toContain("docker compose");
    expect(deployScript).toContain("build web bot migrate");
    expect(deployScript).toContain(
      'run_step "start app services" docker compose'
    );
    expect(deployScript).not.toContain("run_step \"pull app images\"");
    expect(deployScript).not.toContain("WEB_IMAGE=");
    expect(deployScript).not.toContain("BOT_IMAGE=");
    expect(deployScript).not.toContain("MIGRATE_IMAGE=");
  });

  it("delegates image builds to the VPS in GitHub Actions", () => {
    const workflowPath = path.join(
      process.cwd(),
      ".github",
      "workflows",
      "deploy.yml"
    );
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).not.toContain("packages: write");
    expect(workflow).not.toContain("docker/login-action@v3");
    expect(workflow).not.toContain("docker/build-push-action@v6");
    expect(workflow).not.toContain("WEB_IMAGE");
    expect(workflow).not.toContain("BOT_IMAGE");
    expect(workflow).not.toContain("MIGRATE_IMAGE");
    expect(workflow).toContain("sh ./deploy/scripts/deploy.sh");
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

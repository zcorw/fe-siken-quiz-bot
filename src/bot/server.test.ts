/**
 * @vitest-environment node
 */
import { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTelegramWebhookServer } from "./server";

const servers: Server[] = [];

async function listen(server: Server) {
  server.listen(0);
  servers.push(server);
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("createTelegramWebhookServer", () => {
  afterEach(async () => {
    await Promise.all(
      servers.splice(0).map(
        (server) =>
          new Promise<void>((resolve) => {
            server.close(() => resolve());
          })
      )
    );
  });

  it("receives Telegram webhook JSON and passes it to the bot", async () => {
    const handleUpdate = vi.fn().mockResolvedValue(undefined);
    const server = createTelegramWebhookServer({
      bot: { handleUpdate },
      pathPrefix: "/telegram/webhook",
      pathSecret: "path-secret",
      headerSecret: "header-secret",
    });
    await listen(server);

    const { port } = server.address() as AddressInfo;
    const response = await fetch(
      `http://127.0.0.1:${port}/telegram/webhook/path-secret`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "header-secret",
        },
        body: JSON.stringify({ update_id: 1 }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(handleUpdate).toHaveBeenCalledWith({ update_id: 1 });
  });

  it("returns 404 for an invalid path secret", async () => {
    const handleUpdate = vi.fn();
    const server = createTelegramWebhookServer({
      bot: { handleUpdate },
      pathPrefix: "/telegram/webhook",
      pathSecret: "path-secret",
      headerSecret: "header-secret",
    });
    await listen(server);

    const { port } = server.address() as AddressInfo;
    const response = await fetch(
      `http://127.0.0.1:${port}/telegram/webhook/wrong-secret`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "header-secret",
        },
        body: JSON.stringify({ update_id: 1 }),
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ ok: false });
    expect(handleUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 for an invalid Telegram header secret", async () => {
    const handleUpdate = vi.fn();
    const server = createTelegramWebhookServer({
      bot: { handleUpdate },
      pathPrefix: "/telegram/webhook",
      pathSecret: "path-secret",
      headerSecret: "header-secret",
    });
    await listen(server);

    const { port } = server.address() as AddressInfo;
    const response = await fetch(
      `http://127.0.0.1:${port}/telegram/webhook/path-secret`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "wrong-secret",
        },
        body: JSON.stringify({ update_id: 1 }),
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false });
    expect(handleUpdate).not.toHaveBeenCalled();
  });
});

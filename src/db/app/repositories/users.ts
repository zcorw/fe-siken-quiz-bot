import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import type { AppDrizzleDb } from "../client";
import { users } from "../schema";

export interface UpsertTelegramUserInput {
  telegramUserId: string;
  telegramUsername: string | null;
  telegramFirstName?: string | null;
  telegramLastName?: string | null;
  nowIso: string;
}

export type UserRow = typeof users.$inferSelect;

export async function upsertTelegramUser(
  appDb: AppDrizzleDb,
  input: UpsertTelegramUserInput
): Promise<UserRow> {
  const existing = await appDb
    .select()
    .from(users)
    .where(eq(users.telegramUserId, input.telegramUserId))
    .get();

  if (existing !== undefined) {
    await appDb
      .update(users)
      .set({
        telegramUsername: input.telegramUsername,
        telegramFirstName: input.telegramFirstName ?? null,
        telegramLastName: input.telegramLastName ?? null,
        lastSeenAt: input.nowIso,
      })
      .where(eq(users.id, existing.id))
      .run();

    return {
      ...existing,
      telegramUsername: input.telegramUsername,
      telegramFirstName: input.telegramFirstName ?? null,
      telegramLastName: input.telegramLastName ?? null,
      lastSeenAt: input.nowIso,
    };
  }

  const user: UserRow = {
    id: randomUUID(),
    telegramUserId: input.telegramUserId,
    telegramUsername: input.telegramUsername,
    telegramFirstName: input.telegramFirstName ?? null,
    telegramLastName: input.telegramLastName ?? null,
    createdAt: input.nowIso,
    lastSeenAt: input.nowIso,
  };

  await appDb.insert(users).values(user).run();

  return user;
}

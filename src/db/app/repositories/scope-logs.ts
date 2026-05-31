import type { AppDrizzleDb } from "../client";
import { scopeParseLogs } from "../schema";

type JsonPrimitive = string | number | boolean | null;
type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[];

export interface WriteScopeParseLogInput {
  id: string;
  userId: string | null;
  rawInput: string | null;
  method: string | null;
  matchedScope: JsonValue | null;
  suggestions: JsonValue | null;
  status: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export async function writeScopeParseLog(
  appDb: AppDrizzleDb,
  input: WriteScopeParseLogInput
): Promise<void> {
  await appDb
    .insert(scopeParseLogs)
    .values({
      id: input.id,
      userId: input.userId,
      rawInput: input.rawInput,
      method: input.method,
      matchedScopeJson:
        input.matchedScope === null ? null : JSON.stringify(input.matchedScope),
      suggestionsJson:
        input.suggestions === null ? null : JSON.stringify(input.suggestions),
      status: input.status,
      errorMessage: input.errorMessage,
      createdAt: input.createdAt,
    })
    .run();
}

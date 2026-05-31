import type { ScopeParseResult } from "@/quiz/scope-match";
import type { ReplyContext } from "./start";

export interface ScopeMessageContext extends ReplyContext {
  message?: {
    text?: string;
  };
}

export type ScopeParseFunction = (input: string) => Promise<ScopeParseResult>;

export interface HandleScopeMessageOptions {
  ctx: ScopeMessageContext;
  parseScope: ScopeParseFunction;
}

export async function handleScopeMessage({
  ctx,
  parseScope,
}: HandleScopeMessageOptions): Promise<void> {
  const text = ctx.message?.text?.trim();

  if (!text || text.startsWith("/")) {
    return;
  }

  await parseScope(text);
}

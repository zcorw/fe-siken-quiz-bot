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

  const result = await parseScope(text);

  if (result.status === "no_match") {
    if (result.suggestions.length > 0) {
      await ctx.reply(
        `分野を特定できませんでした。近い候補: ${result.suggestions.join("、")}`
      );
      return;
    }

    await ctx.reply(
      "分野を特定できませんでした。練習したい分野を入力し直してください。"
    );
  }
}

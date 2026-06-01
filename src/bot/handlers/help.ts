import type { ReplyContext } from "./start";

export const HELP_MESSAGE =
  "使い方:\n/start - 演習の開始\n/help - ヘルプ表示\n練習したい分野を一度に1つ送ってください。例: データベース";

export async function handleHelpCommand(ctx: ReplyContext): Promise<void> {
  await ctx.reply(HELP_MESSAGE);
}

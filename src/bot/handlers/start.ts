export const START_MESSAGE =
  "基本情報技術者試験 科目Aの演習を作成します。\n練習したい分野を一度に1つ送ってください。例: データベース、ネットワーク、情報セキュリティ";

export interface ReplyContext {
  reply(message: string, options?: unknown): Promise<unknown>;
}

export async function handleStartCommand(ctx: ReplyContext): Promise<void> {
  await ctx.reply(START_MESSAGE);
}

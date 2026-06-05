export interface TelegramWebhookApi {
  setWebhook(
    url: string,
    options: {
      allowed_updates: ["message", "callback_query"];
      secret_token: string;
    }
  ): Promise<unknown>;
}

export interface RegisterTelegramWebhookOptions {
  api: TelegramWebhookApi;
  headerSecret: string;
  pathPrefix: string;
  pathSecret: string;
  publicBaseUrl: string;
}

export async function registerTelegramWebhook({
  api,
  headerSecret,
  pathPrefix,
  pathSecret,
  publicBaseUrl,
}: RegisterTelegramWebhookOptions): Promise<void> {
  const webhookUrl = [
    publicBaseUrl.replace(/\/$/, ""),
    pathPrefix.replace(/^\/?/, ""),
    pathSecret,
  ].join("/");

  await api.setWebhook(webhookUrl, {
    allowed_updates: ["message", "callback_query"],
    secret_token: headerSecret,
  });
}

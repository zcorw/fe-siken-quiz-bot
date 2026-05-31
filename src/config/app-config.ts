import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { ZodError } from "zod";
import { type AppConfig, appConfigSchema } from "./schema";

function formatConfigError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

export async function loadAppConfig(configPath: string): Promise<AppConfig> {
  const source = await readFile(configPath, "utf8");
  const parsed = parse(source);
  const result = appConfigSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `Invalid app config at ${configPath}: ${formatConfigError(result.error)}`
    );
  }

  return result.data;
}

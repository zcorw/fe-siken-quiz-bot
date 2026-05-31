import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/app/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.APP_DB_PATH ?? "./data/app.sqlite",
  },
});

import { defineConfig } from "@playwright/test";
import path from "node:path";

const externalURL = process.env.LEADFLOW_E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: externalURL || "http://127.0.0.1:3100",
    timezoneId: "Asia/Kolkata",
    viewport: { width: 1440, height: 1080 },
    trace: "retain-on-failure",
  },
  webServer: externalURL
    ? undefined
    : [
        {
          command:
            "uv run python scripts/serve_preview.py --port 8100 --database-name e2e.db --fresh",
          cwd: path.resolve(import.meta.dirname, "../backend"),
          url: "http://127.0.0.1:8100/health",
          reuseExistingServer: false,
          timeout: 60_000,
        },
        {
          command: "npm run dev -- --port 3100",
          url: "http://127.0.0.1:3100",
          reuseExistingServer: false,
          timeout: 90_000,
          env: {
            NEXT_PUBLIC_LOCAL_DEMO_MODE: "true",
            NEXT_PUBLIC_API_URL: "http://127.0.0.1:8100",
          },
        },
      ],
});

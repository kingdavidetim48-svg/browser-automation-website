import { defineConfig } from "@trigger.dev/sdk"

export default defineConfig({
  project: "proj_gbeboelriouqgmgjibwj",
  dirs: ["features", "./src/trigger"],
  runtime: "node",
  maxDuration: 900,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
})

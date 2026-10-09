import { defineConfig } from "@trigger.dev/sdk"

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF!,
  dirs: ["./features/workflows/tasks"],
  runtime: "node",
  maxDuration: 900,
})

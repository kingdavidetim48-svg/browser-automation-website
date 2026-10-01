// Browserbase client integration for KingsFlow browser automation
export const browserbase = {
  apiKey: process.env.BROWSERBASE_API_KEY,
  projectId: process.env.BROWSERBASE_PROJECT_ID,
  sessions: {
    create: async (options?: { projectId?: string; keepAlive?: boolean }) => {
      return {
        id: `bb-session-${Date.now()}`,
        status: "RUNNING",
        createdAt: new Date().toISOString(),
        ...options,
      }
    },
    get: async (sessionId: string) => {
      return {
        id: sessionId,
        status: "RUNNING",
      }
    },
  },
}

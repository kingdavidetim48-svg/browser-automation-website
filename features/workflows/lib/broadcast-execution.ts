import { Liveblocks } from "@liveblocks/node"

const liveblocksClient = process.env.LIVEBLOCKS_SECRET_KEY
  ? new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY })
  : undefined

/**
 * Best-effort broadcast of execution state changes to all authenticated
 * Liveblocks clients connected to the workflow room. Never throws so that
 * execution orchestration cannot be disrupted by transient socket issues.
 */
export async function broadcastExecutionUpdate(
  workflowId: string,
  executionId: string
): Promise<void> {
  if (!liveblocksClient) return
  try {
    await liveblocksClient.broadcastEvent(workflowId, {
      type: "EXECUTION_UPDATED",
      executionId,
    })
  } catch {
    // Best-effort real-time notification; DB persistence remains canonical.
  }
}

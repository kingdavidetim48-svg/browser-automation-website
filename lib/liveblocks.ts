import "server-only"
import { Liveblocks } from "@liveblocks/node"

// Server-side Liveblocks client for managing multiplayer workflow rooms and auth tokens.
export const liveblocks = process.env.LIVEBLOCKS_SECRET_KEY
  ? new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY })
  : undefined

export async function deleteWorkflowRoom(roomId: string) {
  if (!liveblocks) return
  try {
    await liveblocks.deleteRoom(roomId)
  } catch (_error) {
    // Best effort cleanup: never fail workflow deletion if room cleanup fails
  }
}

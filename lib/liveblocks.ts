import "server-only"
import { Liveblocks } from "@liveblocks/node"

export let liveblocks: Liveblocks | undefined

function getLiveblocksClient() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not configured")
  }

  if (!secret.startsWith("sk_")) {
    throw new Error(
      "LIVEBLOCKS_SECRET_KEY must be a server-side secret key beginning with sk_."
    )
  }
  liveblocks ??= new Liveblocks({ secret })
  return liveblocks
}

// The workflow editor itself uses React Flow and does not use Liveblocks for
// collaboration. This only removes a legacy room, so initialize on demand.
export async function deleteWorkflowRoom(roomId: string) {
  await getLiveblocksClient().deleteRoom(roomId)
}

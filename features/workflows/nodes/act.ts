import type { Stagehand } from "@browserbasehq/stagehand"

export async function act({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  const result = await stagehand.act(instruction)
  const page = stagehand.context.activePage()

  if (!page) {
    throw new Error(
      "Stagehand completed the action but no browser page is open"
    )
  }

  return {
    success: result.success,
    message: result.message,
    url: page.url(),
  }
}

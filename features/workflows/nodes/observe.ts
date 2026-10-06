import type { Stagehand } from "@browserbasehq/stagehand"

export async function observe({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  const results = await stagehand.observe(instruction)

  const matches = results.data.map(({ selector, description }) => ({
    selector,
    description,
  }))

  return { matches }
}

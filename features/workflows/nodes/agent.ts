import type { Stagehand } from "@browserbasehq/stagehand"

type LegacyAgentStagehand = Stagehand & {
  agent: () => {
    execute: (instruction: string) => Promise<{
      success: boolean
      message: string
      completed: boolean
    }>
  }
}

function supportsLegacyAgent(stagehand: Stagehand): stagehand is LegacyAgentStagehand {
  return typeof (stagehand as Stagehand & { agent?: unknown }).agent === "function"
}

export async function agent({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  if (!supportsLegacyAgent(stagehand)) {
    throw new Error(
      "The Agent node requires Stagehand's agent API, which is not available in the installed Stagehand v4 SDK.",
    )
  }

  const result = await stagehand.agent().execute(instruction)

  return {
    success: result.success,
    message: result.message,
    completed: result.completed,
  }
}

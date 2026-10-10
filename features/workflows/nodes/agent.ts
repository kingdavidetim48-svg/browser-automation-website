import type { Stagehand } from "@browserbasehq/stagehand"

export async function agent({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  if (
    !process.env.GEMINI_API_KEY &&
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
    !process.env.GOOGLE_API_KEY
  ) {
    throw new Error(
      "Agent node requires Gemini credentials (GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY)."
    )
  }

  const result = await stagehand
    .agent({ model: { modelName: "google/gemini-2.5-flash" } })
    .execute({
      instruction,
      maxSteps: 20,
    })

  return {
    success: result.success,
    message: result.message,
    completed: result.completed,
  }
}

import type { Stagehand } from "@browserbasehq/stagehand"

export async function openUrl({
  stagehand,
  url,
}: {
  stagehand: Stagehand
  url: string
}) {
  const page = stagehand.context.activePage()
  if (!page) {
    throw new Error("Cannot open a URL because the browser has no active page")
  }

  await page.goto(url, { waitUntil: "load", timeoutMs: 30_000 })
  return { url: page.url(), title: await page.title() }
}

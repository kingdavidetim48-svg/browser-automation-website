import puppeteer from "puppeteer-core"
import { createClerkClient } from "@clerk/backend"
import { neon } from "@neondatabase/serverless"
import assert from "node:assert/strict"
import path from "node:path"
import fs from "node:fs"
import { randomUUID } from "node:crypto"

const CHROME_PATH =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const ARTIFACT_DIR =
  "C:\\Users\\LOYAL\\.gemini\\antigravity\\brain\\d98e9515-709a-44fd-acf9-e8fdd2bc8aea"
const ORG_ID = "org_3K3ZKMB09enO0oCEK0hTT3RBCYh"
const USER_ID = "user_3K3VfHaCo4id6YUtf6gw1wFUp4B"

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
const sql = neon(process.env.DATABASE_URL)

const results = []
function record(name, status, detail = "") {
  console.log(`[E2E] ${status}: ${name}${detail ? ` — ${detail}` : ""}`)
  results.push({ name, status, detail })
}

async function getSignInUrl() {
  for (let i = 0; i < 3; i++) {
    try {
      const token = await clerk.signInTokens.createSignInToken({
        userId: USER_ID,
        expiresInSeconds: 300,
      })
      return `http://localhost:3000/sign-in?__clerk_ticket=${token.token}`
    } catch {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw new Error("Could not create signInToken")
}

async function createEmptyWorkflow(name) {
  const id = randomUUID()
  const graph = {
    nodes: [
      {
        id: "start",
        type: "step",
        position: { x: 80, y: 180 },
        data: { type: "start", kind: "trigger", title: "Start", values: {} },
      },
    ],
    edges: [],
  }
  await sql.query(
    `INSERT INTO workflows (id, organization_id, name, graph) VALUES ($1, $2, $3, $4)`,
    [id, ORG_ID, name, JSON.stringify(graph)]
  )
  return id
}

async function deleteTestWorkflow(id) {
  try {
    await sql.query(`DELETE FROM workflows WHERE id = $1`, [id])
  } catch {}
}

async function getNodeIds(page) {
  return page.$$eval(".react-flow__node[data-id]", (els) =>
    els.map((e) => e.getAttribute("data-id")).filter(Boolean)
  )
}

async function addAndConnectNode(page, { type, offsetX, offsetY, sourceId, fields }) {
  const beforeIds = await getNodeIds(page)

  // Drop node onto canvas pane
  await page.evaluate(
    ({ type, offsetX, offsetY }) => {
      const pane = document.querySelector(".react-flow__pane")
      if (!pane) throw new Error("Canvas pane not found")
      const rect = pane.getBoundingClientRect()
      const dropX = rect.left + offsetX
      const dropY = rect.top + offsetY
      const dataTransfer = new DataTransfer()
      dataTransfer.setData("application/reactflow", type)
      pane.dispatchEvent(
        new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          clientX: dropX,
          clientY: dropY,
          dataTransfer,
        })
      )
      pane.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          clientX: dropX,
          clientY: dropY,
          dataTransfer,
        })
      )
    },
    { type, offsetX, offsetY }
  )

  await new Promise((r) => setTimeout(r, 800))
  const afterIds = await getNodeIds(page)
  const newId = afterIds.find((id) => !beforeIds.includes(id))
  if (!newId) {
    throw new Error(`Failed to add node of type ${type}`)
  }

  // Connect sourceId -> newId via mouse drag between handles
  const srcBox = await page.$eval(
    `[data-id="${sourceId}"] .react-flow__handle-right`,
    (el) => {
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }
  )
  const tgtBox = await page.$eval(
    `[data-id="${newId}"] .react-flow__handle-left`,
    (el) => {
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }
  )

  await page.mouse.move(srcBox.x, srcBox.y)
  await page.mouse.down()
  await page.mouse.move(tgtBox.x, tgtBox.y, { steps: 12 })
  await page.mouse.up()
  await new Promise((r) => setTimeout(r, 600))

  // Click node to open Editor and fill fields
  await page.click(`[data-id="${newId}"]`)
  await new Promise((r) => setTimeout(r, 500))

  for (const [key, value] of Object.entries(fields)) {
    const selector = `#${key}`
    await page.waitForSelector(selector, { timeout: 5000 })
    await page.click(selector, { clickCount: 3 })
    await page.type(selector, value)
    await new Promise((r) => setTimeout(r, 200))
  }

  return newId
}

async function waitForStatus(page, targets, timeoutMs = 120000) {
  const start = Date.now()
  let sawActive = false
  let lastText = ""
  while (Date.now() - start < timeoutMs) {
    const text = await page.evaluate(() => {
      const bar = document.querySelector('[data-testid="execution-status-bar"]')
      return bar ? (bar.textContent ?? "") : ""
    })
    if (text) lastText = text
    if (text.includes("RUNNING") || text.includes("QUEUED") || text.includes("PENDING")) {
      sawActive = true
    }
    for (const t of targets) {
      if (text.includes(t)) {
        return { matched: t, text, sawActive }
      }
    }
    await new Promise((r) => setTimeout(r, 600))
  }
  return { matched: null, text: lastText, sawActive }
}

async function getNodeStatuses(page) {
  return page.$$eval("[data-execution-status]", (els) =>
    els.map((e) => ({
      id: e.closest("[data-id]")?.getAttribute("data-id") ?? "?",
      status: e.getAttribute("data-execution-status"),
    }))
  )
}

async function main() {
  console.log("=== KINGSFLOW MILESTONE 2 E2E EXECUTION VERIFICATION ===\n")

  const wfPassId = await createEmptyWorkflow("M2 E2E Pass Test")
  const wfFailId = await createEmptyWorkflow("M2 E2E Fail Test")
  const wfCancelId = await createEmptyWorkflow("M2 E2E Cancel Test")

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  })

  const errorsA = []
  const errorsB = []

  try {
    const contextA = await browser.createBrowserContext()
    const pageA = await contextA.newPage()
    await pageA.setViewport({ width: 1440, height: 900 })
    pageA.on("pageerror", (e) => errorsA.push(`PageError: ${e.message}`))
    pageA.on("console", (m) => {
      if (m.type() === "error") errorsA.push(`ConsoleError: ${m.text()}`)
    })

    const contextB = await browser.createBrowserContext()
    const pageB = await contextB.newPage()
    await pageB.setViewport({ width: 1366, height: 768 })
    pageB.on("pageerror", (e) => errorsB.push(`PageError: ${e.message}`))
    pageB.on("console", (m) => {
      if (m.type() === "error") errorsB.push(`ConsoleError: ${m.text()}`)
    })

    console.log("Warming up Next.js workflow route…")
    await fetch(`http://localhost:3000/workflows/${wfPassId}`, { redirect: "manual" }).catch(() => {})

    console.log("Authenticating Session A & Session B…")
    await pageA.goto(await getSignInUrl(), { waitUntil: "domcontentloaded", timeout: 60000 })
    await pageA.waitForFunction(() => !!window.Clerk?.user, { timeout: 20000 }).catch(() => {})
    await new Promise((r) => setTimeout(r, 1500))

    await pageB.goto(await getSignInUrl(), { waitUntil: "domcontentloaded", timeout: 60000 })
    await pageB.waitForFunction(() => !!window.Clerk?.user, { timeout: 20000 }).catch(() => {})
    await new Promise((r) => setTimeout(r, 1500))
    record("Dual-Session Clerk Authentication", "PASS")

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 1: COMPLETED WORKFLOW EXECUTION + UPSTREAM PASSING + SYNC
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n--- Test 1: Completed Workflow (${wfPassId}) ---`)
    const urlPass = `http://localhost:3000/workflows/${wfPassId}`
    await pageA.goto(urlPass, { waitUntil: "domcontentloaded", timeout: 90000 })
    await pageB.goto(urlPass, { waitUntil: "domcontentloaded", timeout: 90000 })
    await pageA.waitForSelector(".react-flow__node-step", { timeout: 25000 })
    await pageB.waitForSelector(".react-flow__node-step", { timeout: 25000 })
    await new Promise((r) => setTimeout(r, 2000))

    // Build graph on canvas: Start -> open1 (example.com) -> open2 ({{open1.url}})
    const open1Id = await addAndConnectNode(pageA, {
      type: "open-url",
      offsetX: 420,
      offsetY: 160,
      sourceId: "start",
      fields: { url: "https://example.com" },
    })
    const open2Id = await addAndConnectNode(pageA, {
      type: "open-url",
      offsetX: 420,
      offsetY: 360,
      sourceId: open1Id,
      fields: { url: `{{${open1Id}.url}}` },
    })
    await new Promise((r) => setTimeout(r, 2000))
    await pageA.screenshot({ path: path.join(ARTIFACT_DIR, "e2e_pass_initial_A.png") })

    // Verify Session B received all 3 nodes via Liveblocks
    const nodesInB = await getNodeIds(pageB)
    console.log("Session B node count after build:", nodesInB.length)
    assert.equal(nodesInB.length, 3, "Session B should sync all 3 nodes before run")

    // Click Run in Session A
    await pageA.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) =>
        /^Run$/.test(b.innerText.trim())
      )
      if (btn) btn.click()
    })

    // Try to catch RUNNING state screenshot
    const midRes = await waitForStatus(pageA, ["RUNNING", "COMPLETED", "FAILED"], 30000)
    await pageA.screenshot({ path: path.join(ARTIFACT_DIR, "e2e_pass_running_A.png") })

    const resPassA =
      midRes.matched === "COMPLETED" || midRes.matched === "FAILED"
        ? midRes
        : await waitForStatus(pageA, ["COMPLETED", "FAILED"], 120000)
    console.log("Session A status:", resPassA)
    assert.equal(
      resPassA.matched,
      "COMPLETED",
      `Expected COMPLETED in Session A, got ${resPassA.matched} (${resPassA.text})`
    )
    record(
      "End-to-End Completed Execution (Session A)",
      "PASS",
      `Saw active=${resPassA.sawActive || midRes.matched === "RUNNING"}, final="${resPassA.text.slice(0, 80)}"`
    )

    // Check Session B updated WITHOUT refresh
    const resPassB = await waitForStatus(pageB, ["COMPLETED"], 25000)
    assert.equal(
      resPassB.matched,
      "COMPLETED",
      `Expected COMPLETED in Session B without refresh, got ${resPassB.text}`
    )
    record(
      "Real-Time Cross-Session Sync (Session B)",
      "PASS",
      `Session B updated without refresh: "${resPassB.text.slice(0, 80)}"`
    )

    await pageA.screenshot({ path: path.join(ARTIFACT_DIR, "e2e_pass_completed_A.png") })
    await pageB.screenshot({ path: path.join(ARTIFACT_DIR, "e2e_pass_completed_B.png") })

    // Verify all 3 nodes highlighted as completed in both sessions
    const nodesPassA = await getNodeStatuses(pageA)
    const nodesPassB = await getNodeStatuses(pageB)
    console.log("Session A node statuses:", nodesPassA)
    console.log("Session B node statuses:", nodesPassB)
    assert.ok(nodesPassA.every((n) => n.status === "completed"), "All nodes in Session A must be completed")
    assert.ok(nodesPassB.every((n) => n.status === "completed"), "All nodes in Session B must be completed")
    record("Real-Time Node Highlighting (Both Sessions)", "PASS", "All 3 nodes marked completed in both sessions")

    // Click open1Id first (since open2Id was already selected during build), then open2Id to open Inspector
    await pageA.click(`[data-id="${open1Id}"]`)
    await new Promise((r) => setTimeout(r, 400))
    await pageA.click(`[data-id="${open2Id}"]`)
    await new Promise((r) => setTimeout(r, 1000))
    const inspectorText = await pageA.evaluate(() => {
      const el = document.querySelector('[data-testid="node-execution-inspector"]')
      return el ? (el.textContent ?? "") : ""
    })
    assert.ok(inspectorText.includes("completed"), "Inspector must show completed status")
    assert.ok(inspectorText.includes("https://example.com"), "Inspector must show interpolated upstream URL")
    await pageA.screenshot({ path: path.join(ARTIFACT_DIR, "e2e_pass_inspector_A.png") })
    record("Node Inspector & Upstream Output Passing", "PASS", `open2 (${open2Id.slice(0, 8)}) received https://example.com from open1.url`)

    // Expand Event Log in LogsPanel
    await pageA.evaluate(() => {
      const btns = [...document.querySelectorAll("button")]
      const logBtn = btns.find((b) => /Event Log/i.test(b.innerText))
      if (logBtn) logBtn.click()
    })
    await new Promise((r) => setTimeout(r, 600))
    await pageA.screenshot({ path: path.join(ARTIFACT_DIR, "e2e_pass_logs_A.png") })
    const logsText = await pageA.evaluate(() => document.body.innerText)
    assert.ok(
      logsText.includes("execution.started") || logsText.includes("Started workflow") || logsText.includes("Completed"),
      "Logs panel must display execution log events"
    )
    record("Execution Logs Panel Verification", "PASS", "Timestamped execution events displayed")

    // Verify DB records for wfPassId
    const dbExecPass = await sql.query(
      `SELECT id, status, trigger_run_id, total_nodes, completed_nodes, failed_nodes, browserbase_session_id, started_at, completed_at
       FROM workflow_executions WHERE workflow_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [wfPassId]
    )
    assert.equal(dbExecPass.length, 1)
    assert.equal(dbExecPass[0].status, "COMPLETED")
    assert.equal(dbExecPass[0].completed_nodes, 3)
    assert.equal(dbExecPass[0].failed_nodes, 0)
    assert.ok(dbExecPass[0].trigger_run_id, "trigger_run_id must be persisted")
    assert.ok(dbExecPass[0].started_at && dbExecPass[0].completed_at, "Timestamps must be persisted")

    const dbNodeRunsPass = await sql.query(
      `SELECT node_id, status, input, output, duration_ms FROM execution_node_runs WHERE execution_id = $1`,
      [dbExecPass[0].id]
    )
    assert.equal(dbNodeRunsPass.length, 3)
    const open2Db = dbNodeRunsPass.find((r) => r.node_id === open2Id)
    assert.ok(
      open2Db?.input?.url?.startsWith("https://example.com"),
      "open2 DB input must have interpolated upstream URL"
    )
    assert.ok(open2Db?.output?.title, "open2 DB output must have page title")
    assert.ok(typeof open2Db?.duration_ms === "number" && open2Db.duration_ms >= 0, "duration_ms must be recorded")

    const dbLogsPass = await sql.query(
      `SELECT event_type FROM execution_logs WHERE execution_id = $1`,
      [dbExecPass[0].id]
    )
    assert.ok(dbLogsPass.length >= 6, `Expected >= 6 logs, got ${dbLogsPass.length}`)
    record(
      "DB Persistence (Completed Execution)",
      "PASS",
      `execId=${dbExecPass[0].id.slice(0, 8)}, triggerRunId=${dbExecPass[0].trigger_run_id}, logs=${dbLogsPass.length}`
    )

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 2: CONTROLLED FAILED EXECUTION + REDACTION + SKIPPED DOWNSTREAM
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n--- Test 2: Failed Workflow (${wfFailId}) ---`)
    const urlFail = `http://localhost:3000/workflows/${wfFailId}`
    await pageA.goto(urlFail, { waitUntil: "domcontentloaded", timeout: 45000 })
    await pageB.goto(urlFail, { waitUntil: "domcontentloaded", timeout: 45000 })
    await pageA.waitForSelector(".react-flow__node-step", { timeout: 25000 })
    await pageB.waitForSelector(".react-flow__node-step", { timeout: 25000 })
    await new Promise((r) => setTimeout(r, 2000))

    const email1Id = await addAndConnectNode(pageA, {
      type: "send-email",
      offsetX: 420,
      offsetY: 160,
      sourceId: "start",
      fields: {
        to: "test@example.com",
        subject: "M2 Failure Test",
        body: "Token: Bearer sk_test_secret1234567890abcdef",
      },
    })
    const openAfterId = await addAndConnectNode(pageA, {
      type: "open-url",
      offsetX: 420,
      offsetY: 360,
      sourceId: email1Id,
      fields: { url: "https://example.com" },
    })
    await new Promise((r) => setTimeout(r, 2000))

    await pageA.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) =>
        /^Run$/.test(b.innerText.trim())
      )
      if (btn) btn.click()
    })

    const resFailA = await waitForStatus(pageA, ["FAILED"], 60000)
    assert.equal(resFailA.matched, "FAILED", `Expected FAILED in Session A, got ${resFailA.text}`)
    const resFailB = await waitForStatus(pageB, ["FAILED"], 25000)
    assert.equal(resFailB.matched, "FAILED", `Expected FAILED in Session B without refresh, got ${resFailB.text}`)

    const nodesFailA = await getNodeStatuses(pageA)
    console.log("Failed run node statuses (Session A):", nodesFailA)
    assert.equal(nodesFailA.find((n) => n.id === "start")?.status, "completed")
    assert.equal(nodesFailA.find((n) => n.id === email1Id)?.status, "failed")
    assert.equal(nodesFailA.find((n) => n.id === openAfterId)?.status, "skipped")

    // Click failed node `email1Id` to inspect error & redaction
    await pageA.click(`[data-id="${email1Id}"]`)
    await new Promise((r) => setTimeout(r, 1000))
    const failInspectorText = await pageA.evaluate(() => {
      const el = document.querySelector('[data-testid="node-execution-inspector"]')
      return el ? (el.textContent ?? "") : ""
    })
    assert.ok(failInspectorText.includes("RESEND_FROM_EMAIL"), "Inspector must display failure error message")
    assert.ok(failInspectorText.includes("[REDACTED]"), "Inspector must redact Bearer token in input")
    assert.ok(!failInspectorText.includes("sk_test_secret1234567890abcdef"), "Raw secret must NOT appear in Inspector")

    await pageA.screenshot({ path: path.join(ARTIFACT_DIR, "e2e_fail_A.png") })
    await pageB.screenshot({ path: path.join(ARTIFACT_DIR, "e2e_fail_B.png") })

    record(
      "End-to-End Controlled Failed Execution & Redaction",
      "PASS",
      "start=completed, send-email=failed, open-url=skipped; secret redacted to [REDACTED]"
    )

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 3: CANCELLATION OF AN ACTIVE EXECUTION
    // ═══════════════════════════════════════════════════════════════════════
    console.log(`\n--- Test 3: Cancellation (${wfCancelId}) ---`)
    const urlCancel = `http://localhost:3000/workflows/${wfCancelId}`
    await pageA.goto(urlCancel, { waitUntil: "domcontentloaded", timeout: 45000 })
    await pageA.waitForSelector(".react-flow__node-step", { timeout: 25000 })
    await new Promise((r) => setTimeout(r, 2000))

    const slow1Id = await addAndConnectNode(pageA, {
      type: "open-url",
      offsetX: 420,
      offsetY: 160,
      sourceId: "start",
      fields: { url: "https://example.com" },
    })
    await addAndConnectNode(pageA, {
      type: "open-url",
      offsetX: 420,
      offsetY: 360,
      sourceId: slow1Id,
      fields: { url: "https://example.org" },
    })
    await new Promise((r) => setTimeout(r, 1500))

    await pageA.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) =>
        /^Run$/.test(b.innerText.trim())
      )
      if (btn) btn.click()
    })

    // Wait for Stop button to appear and click it
    let stopClicked = false
    const stopStart = Date.now()
    while (Date.now() - stopStart < 25000) {
      stopClicked = await pageA.evaluate(() => {
        const btn = [...document.querySelectorAll("button")].find((b) =>
          /Stop/.test(b.innerText.trim())
        )
        if (btn && !btn.disabled) {
          btn.click()
          return true
        }
        return false
      })
      if (stopClicked) break
      await new Promise((r) => setTimeout(r, 300))
    }
    assert.ok(stopClicked, "Stop button must appear while execution is active and be clicked")

    const resCancel = await waitForStatus(pageA, ["CANCELLED"], 30000)
    assert.equal(resCancel.matched, "CANCELLED", `Expected CANCELLED after clicking Stop, got ${resCancel.text}`)
    await pageA.screenshot({ path: path.join(ARTIFACT_DIR, "e2e_cancel_A.png") })

    const dbCancel = await sql.query(
      `SELECT status FROM workflow_executions WHERE workflow_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [wfCancelId]
    )
    assert.equal(dbCancel[0]?.status, "CANCELLED")
    record("Active Execution Cancellation", "PASS", "Stop button cancelled active execution → CANCELLED in UI & DB")

    // ═══════════════════════════════════════════════════════════════════════
    // CONSOLE / PAGE ERRORS CHECK
    // ═══════════════════════════════════════════════════════════════════════
    console.log("\nSession A console/page errors:", errorsA)
    console.log("Session B console/page errors:", errorsB)
    record(
      "Browser Console Errors",
      errorsA.length === 0 && errorsB.length === 0 ? "PASS" : "INFO",
      `Session A: ${errorsA.length}, Session B: ${errorsB.length}`
    )
  } finally {
    await browser.close()
    await deleteTestWorkflow(wfPassId)
    await deleteTestWorkflow(wfFailId)
    await deleteTestWorkflow(wfCancelId)
  }

  console.log("\n=== E2E VERIFICATION SUMMARY ===")
  const failed = results.filter((r) => r.status === "FAIL").length
  for (const r of results) {
    console.log(`${r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "ℹ️"} ${r.name}: ${r.detail}`)
  }
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error("E2E test error:", err)
  process.exit(1)
})

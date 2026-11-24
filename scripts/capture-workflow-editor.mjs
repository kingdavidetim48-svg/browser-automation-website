import puppeteer from "puppeteer-core";
import { createClerkClient } from "@clerk/backend";
import path from "path";
import fs from "fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT_DIR = path.resolve(process.cwd(), "..", "screenshots");
const ARTIFACT_DIR = "C:\\Users\\LOYAL\\.gemini\\antigravity\\brain\\980e3d49-2c33-4810-9598-67a90dc6bd48";

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function getSignInUrl() {
  for (let i = 0; i < 3; i++) {
    try {
      const token = await clerk.signInTokens.createSignInToken({
        userId: "user_3K3VfHaCo4id6YUtf6gw1wFUp4B",
        expiresInSeconds: 300,
      });
      return `http://localhost:3000/sign-in?__clerk_ticket=${token.token}`;
    } catch (e) {
      console.log(`Retry ${i + 1} failed:`, e.message);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Could not create signInToken after retries");
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  console.log("Obtaining Clerk sign-in ticket...");
  const signInUrl = await getSignInUrl();

  console.log("Navigating to sign-in with ticket...");
  await page.goto(signInUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  console.log("Initial sign-in page loaded, waiting for Clerk session...");
  
  // Wait up to 10s for Clerk to process the ticket and redirect or authenticate
  try {
    await page.waitForFunction(() => !!window.Clerk?.user, { timeout: 15000 });
    console.log("Clerk user authenticated!");
  } catch {
    console.log("waitForFunction Clerk.user timed out, checking URL:", page.url());
  }

  await new Promise((r) => setTimeout(r, 2000));
  console.log("Current URL after ticket processing:", page.url());

  const targetWorkflowUrl = "http://localhost:3000/workflows/86c860b5-8f27-433d-a004-421f1ed69ed6";
  console.log("Navigating to workflow editor:", targetWorkflowUrl);
  await page.goto(targetWorkflowUrl, { waitUntil: "networkidle2", timeout: 30000 });
  console.log("Waiting for .react-flow canvas to be ready...");
  await page.waitForSelector(".react-flow", { timeout: 20000 });
  await page.waitForSelector(".react-flow__node-step", { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 2000));

  // Take screenshot 1366x768 initial (Toolbar open)
  await page.screenshot({ path: path.join(OUT_DIR, "workflow_1366x768_toolbar_open.png") });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "workflow_1366x768_toolbar_open.png") });
  console.log("Saved: workflow_1366x768_toolbar_open.png");

  // Click on a step node to select it and test Editor tab
  try {
    const stepNode = await page.$(".react-flow__node-step");
    if (stepNode) {
      console.log("Clicking step node to select it and open Editor tab...");
      await stepNode.click();
      await new Promise((r) => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(OUT_DIR, "workflow_1366x768_node_selected.png") });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "workflow_1366x768_node_selected.png") });
      console.log("Saved: workflow_1366x768_node_selected.png");
    } else {
      console.log("No .react-flow__node-step found");
    }
  } catch (err) {
    console.error("Failed to click step node:", err.message);
  }

  // Viewports test
  const viewports = [
    { name: "1440x900", width: 1440, height: 900 },
    { name: "1920x1080", width: 1920, height: 1080 },
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(OUT_DIR, `workflow_${vp.name}_toolbar_open.png`) });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, `workflow_${vp.name}_toolbar_open.png`) });
    console.log(`Saved: workflow_${vp.name}_toolbar_open.png`);
  }

  await browser.close();
  console.log("Screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

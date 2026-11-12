import { config } from "dotenv";
import Browserbase from "@browserbasehq/sdk";

// Load .env.local
config({ path: ".env.local" });

async function runTest() {
  const apiKey = process.env.BROWSERBASE_API_KEY?.trim();
  const projectId = process.env.BROWSERBASE_PROJECT_ID?.trim();

  console.log("=== BROWSERBASE CONNECTIVITY TEST ===");

  if (!apiKey) {
    console.error("STATUS: FAILED - BROWSERBASE_API_KEY is not set in .env.local");
    process.exit(1);
  }

  console.log("Credentials detected:");
  console.log("- BROWSERBASE_API_KEY: Configured (length: " + apiKey.length + ")");
  console.log("- BROWSERBASE_PROJECT_ID: " + (projectId ? "Configured (" + projectId + ")" : "Not set (optional default project)"));

  const bb = new Browserbase({ apiKey });

  let sessionId = null;
  try {
    console.log("\nAttempting to authenticate and create a cloud browser session...");
    const session = await bb.sessions.create({
      projectId: projectId || undefined,
    });

    sessionId = session.id;
    console.log("SUCCESS: Cloud session created.");
    console.log("- Session ID: " + session.id);
    console.log("- Status: " + session.status);
    console.log("- Created At: " + session.createdAt);

    // Retrieve session to verify read access
    console.log("\nVerifying session retrieval...");
    const retrieved = await bb.sessions.retrieve(sessionId);
    console.log("SUCCESS: Session verified. Current status: " + retrieved.status);

    return { success: true, sessionId };
  } catch (error) {
    console.error("ERROR: Failed during session creation/verification:", error.message || error);
    return { success: false, error };
  } finally {
    if (sessionId) {
      console.log("\nCleaning up: Closing session " + sessionId + " safely...");
      try {
        await bb.sessions.update(sessionId, { status: "REQUEST_RELEASE" });
        console.log("SUCCESS: Session released and closed safely.");
      } catch (closeErr) {
        console.error("WARNING: Failed to release session:", closeErr.message || closeErr);
      }
    }
  }
}

runTest().then((res) => {
  if (!res.success) {
    process.exit(1);
  }
  console.log("\n=== ALL BROWSERBASE CONNECTIVITY CHECKS PASSED ===");
});


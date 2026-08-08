import "dotenv/config";
import cron from "node-cron";
import { generatePost } from "./agent.js";
import { publishPost } from "./publisher.js";

// Runs every Monday at 8:00 AM UTC
const SCHEDULE = "0 8 * * 1";

console.log("Blog agent scheduler started. Posting every Monday at 8:00 AM UTC.");

cron.schedule(SCHEDULE, async () => {
  console.log(`\n[${new Date().toISOString()}] Weekly post triggered.`);
  try {
    const post = await generatePost();
    await publishPost(post);
  } catch (err) {
    console.error("Scheduled post failed:", err);
  }
});

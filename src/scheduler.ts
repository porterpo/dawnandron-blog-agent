import "dotenv/config";
import cron from "node-cron";
import { generatePost } from "./agent.js";
import { publishPost } from "./publisher.js";

// Runs every Sunday at 13:00 UTC (9:00 AM EST / EDT)
const SCHEDULE = "0 13 * * 0";

console.log("Blog agent scheduler started. Posting every Sunday at 9:00 AM EST.");

cron.schedule(SCHEDULE, async () => {
  console.log(`\n[${new Date().toISOString()}] Weekly post triggered.`);
  try {
    const post = await generatePost();
    await publishPost(post);
  } catch (err) {
    console.error("Scheduled post failed:", err);
  }
});

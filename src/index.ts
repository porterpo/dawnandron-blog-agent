import "dotenv/config";
import { generatePost } from "./agent.js";
import { publishPost } from "./publisher.js";

async function run() {
  const topicFlag = process.argv.indexOf("--topic");
  const topic = topicFlag !== -1 ? process.argv[topicFlag + 1] : undefined;

  if (topic) {
    console.log(`Manual topic provided: "${topic}"`);
  } else {
    console.log("No topic provided — Claude will pick one.");
  }

  const post = await generatePost(topic);
  await publishPost(post);
}

run().catch((err) => {
  console.error("Agent error:", err);
  process.exit(1);
});

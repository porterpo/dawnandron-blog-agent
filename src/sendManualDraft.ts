import "dotenv/config";
import { saveDraft } from "./draft.js";
import { generateHeroImage } from "./imageGenerator.js";
import { sendDraftNotification } from "./telegram.js";
import type { GeneratedPost } from "./agent.js";

const TOPIC = "US LLC Annual Compliance Checklist for Non-Residents in 2026: Form 5472, Registered Agents, and State Fees Explained";

const CONTENT = `# US LLC Annual Compliance Checklist for Non-Residents in 2026: Form 5472, Registered Agents, and State Fees Explained

Running a US LLC as a non-resident means compliance is not optional. Miss a deadline and you face penalties that can dwarf your actual tax bill. This checklist covers every recurring obligation you need to track in 2026.

---

## Why Compliance Hits Harder for Non-Residents

The IRS treats foreign-owned single-member LLCs as high-priority reporting entities. You have fewer grace periods, steeper automatic penalties, and less recourse when things go wrong.

The good news: every obligation below is predictable. Build it into your calendar once and it runs itself.

---

## The 2026 Annual Compliance Checklist

### 1. Beneficial Ownership Information (BOI) Report: No Longer Required for U.S. LLCs

If you have followed BOI news over the past two years, you know it has been a moving target. As of 2026, the story is finally settled.

On August 11, 2026, FinCEN issued a final rule permanently removing BOI reporting requirements for U.S. domestic entities and U.S. persons. It was published in the Federal Register on August 14, 2026 and took effect immediately, making permanent the interim exemption that had been in place since March 2025.

**What this means for non-resident founders**

If your LLC is formed under the laws of any U.S. state (Wyoming, Delaware, New Mexico, Florida, or elsewhere), it is a domestic entity. That is true no matter where you personally live or hold citizenship. You do not need to file a BOI report, and you are not subject to the $591 per day penalty that used to apply.

**Who still has to file**

BOI reporting now applies only to foreign reporting companies: entities formed under the laws of another country that then register to do business in a U.S. state or Tribal jurisdiction. You would only trigger this if you already owned, for example, a UK Ltd or a UAE free zone company and then registered that foreign entity to operate in the U.S.

> **Note:** If you filed a BOI report in 2024 under the old rules, you can leave it alone. FinCEN is not requiring anyone to withdraw prior filings or submit updates.

---

### 2. Form 5472 (IRS Requirement for Foreign-Owned LLCs)

If your LLC is a single-member LLC owned by a non-US person, it is treated as a disregarded entity but still must file **Form 5472** attached to a pro-forma **Form 1120**.

Key facts for 2026:

| Detail | Requirement |
|---|---|
| Who must file | Single-member LLCs with a foreign owner |
| Deadline | April 15 (or October 15 with extension) |
| Penalty for missing | **$25,000 per violation** |
| What it reports | Any "reportable transactions" between you and your LLC |

Reportable transactions include owner contributions, distributions, loans, and payments for services. Even if your LLC earned zero revenue, if money moved between you and the LLC, you must file.

> **Note:** Form 5472 has a $25,000 automatic penalty. The IRS does not send warnings. The penalty hits the moment the deadline passes without a filing.

---

### 3. Registered Agent: Annual Renewal

Every US LLC must maintain a registered agent in its state of formation. This is not a one-time setup. It is an ongoing annual requirement.

What to verify each year:

- Your registered agent is still active and has your current contact details.
- You have not missed any state-forwarded legal notices or tax correspondence.
- Your agent's annual fee has been paid (typically **$50 to $300 per year** depending on the state and provider).

If your registered agent resigns or lapses, your LLC can be administratively dissolved without notice to you.

---

### 4. State Annual Reports and Franchise Fees

Most states require an annual report or franchise tax payment to keep your LLC in good standing. Deadlines and fees vary significantly.

| State | Annual Fee (2026) | Deadline |
|---|---|---|
| Wyoming | $60 minimum | Anniversary month |
| Delaware | $300 flat fee | June 1 |
| New Mexico | No annual report | N/A |
| Florida | $138.75 | May 1 |

> **Note:** New Mexico has no annual report, making it attractive for non-residents who want minimal recurring costs. Wyoming remains popular for its low fees and strong LLC protections.

Failure to file an annual report typically results in a late penalty followed by administrative dissolution if ignored.

---

### 5. State and Federal Tax Obligations

Even with no US-source income, stay on top of these:

- **Federal:** File Form 5472 plus pro-forma 1120 by April 15. File Form 1040-NR if you have US-source income.
- **State:** Some states have minimum franchise taxes regardless of revenue (California charges $800 minimum annually).
- **Sales tax:** If you sell to US customers, review your nexus obligations by state.

---

## Your 2026 Compliance Timeline at a Glance

| Month | Action |
|---|---|
| January | Confirm registered agent is active and contact details are current |
| March | Gather records for Form 5472; confirm all transactions with your LLC |
| April 15 | File Form 5472 and pro-forma 1120 (or request extension) |
| May to June | Pay state annual report fees depending on your state |

---

## Don't Navigate This Alone

Missing even one item on this list can cost you thousands. The $25,000 Form 5472 penalty alone makes professional guidance worth every cent.

If you want a clear, step by step walkthrough of your specific LLC setup and obligations, visit our [LLC Guide](/llc-guide) or book a session through our [Consultancy](/consultancy) page. We work directly with non-resident founders to make sure nothing falls through the cracks.`;

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

async function main() {
  const title = CONTENT.match(/^#\s+(.+)$/m)![1].trim();
  const post: GeneratedPost = {
    title,
    slug: slugify(title),
    content: CONTENT,
    imageUrl: "",
    topic: TOPIC,
    pillar: "us-business-formation",
  };

  const { buffer } = await generateHeroImage(post.topic);
  await saveDraft(post);
  await sendDraftNotification(post, buffer);
  console.log("Manual draft saved and sent to Telegram.");
}

main().catch((err) => {
  console.error("Manual draft error:", err);
  process.exit(1);
});

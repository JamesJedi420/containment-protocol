require("dotenv").config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "JamesJedi420/containment-protocol";

if (!GITHUB_TOKEN) {
  console.error("Missing GITHUB_TOKEN in .env");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");

const closures = [
  // April 27 01:24 batch — both open
  { close: 824, keep: 813, title: "cross-zone contamination propagation profiles" },
  { close: 822, keep: 818, title: "multi-thread convergence case graph" },
  { close: 821, keep: 816, title: "social-manipulator antagonist behavior" },
  // April 27 01:33 batch — both open
  { close: 839, keep: 831, title: "public warning and inclusive evacuation operations" },
  { close: 838, keep: 829, title: "cross-sector partner ecosystem and weighted involvement" },
  { close: 837, keep: 830, title: "community lifeline dependency graph" },
  { close: 835, keep: 828, title: "capability gap and investment loop" },
  { close: 833, keep: 825, title: "capability-target template renderer" },
  // April 26 11:13-11:28 batch — both open
  { close: 783, keep: 775, title: "dynamic anomalous city topology mutation" },
  // April 26 01:25 batch — both open
  { close: 706, keep: 697, title: "template grammar for doctrine and playbook assets" },
  // April 23 batch — both open
  { close: 610, keep: 609, title: "companion autonomy, training, and lifecycle" },
  // April 28 batch — higher open, lower already closed (both need closing)
  { close: 929, keep: 925, title: "multi-species swarm siege and shelter defense" },
  { close: 928, keep: 926, title: "land-use curse activation and site-history resolution" },
  // April 24 batch — higher open, lower already closed
  { close: 670, keep: 664, title: "temporal haunting scheduler" },
];

async function ghApi(path, method = "GET", body = null) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status} on ${path}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  if (dryRun) console.log("DRY RUN — no changes will be sent\n");
  console.log(`Processing ${closures.length} duplicate closures...\n`);

  let applied = 0;
  let skipped = 0;

  for (const { close, keep, title } of closures) {
    const comment = `Sync-retry duplicate of #${keep} ("${title}"). Both issues were created by separate Linear→GitHub sync events for the same issue. Closing this one; #${keep} is canonical.`;

    console.log(`#${close} → duplicate of #${keep}`);

    if (dryRun) {
      console.log("  (dry-run: would comment + close)\n");
      skipped++;
      continue;
    }

    try {
      // Check current state first to avoid re-closing already closed issues
      const issue = await ghApi(`/issues/${close}`);
      if (issue.state === "closed") {
        console.log("  Already closed — skipping\n");
        skipped++;
        continue;
      }

      await ghApi(`/issues/${close}/comments`, "POST", { body: comment });
      await ghApi(`/issues/${close}`, "PATCH", { state: "closed", state_reason: "not_planned" });
      console.log("  Comment added + closed\n");
      applied++;
    } catch (err) {
      console.error(`  ERROR: ${err.message}\n`);
    }
  }

  console.log(`Done. Applied: ${applied}, Skipped: ${skipped}`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});

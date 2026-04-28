require("dotenv").config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "JamesJedi420/containment-protocol";

if (!GITHUB_TOKEN) {
  console.error("Missing GITHUB_TOKEN in .env");
  process.exit(1);
}

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
    throw new Error(`GitHub API error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

const closures = [
  {
    number: 764,
    comment:
      "Duplicate of #760 (both sync to Linear SPE-756: Disposable operative bait doctrine). " +
      "Linear has already marked SPE-760 as Duplicate of SPE-756. " +
      "Closing to resolve GitHub sync drift — #760 is canonical.",
  },
  {
    number: 765,
    comment:
      "Duplicate of #763 (both sync to Linear SPE-758: Rhythmic traversal alarms and observed-footwork bypass). " +
      "Linear has already marked SPE-762 as Duplicate of SPE-758. " +
      "Closing to resolve GitHub sync drift — #763 is canonical.",
  },
  {
    number: 744,
    comment:
      "Duplicate of #743 (both sync to the same Linear issue SPE-740: Artifact provenance, ordeal gates, and rarity caps). " +
      "This is a sync-retry duplicate — two GitHub issues were created for one Linear issue. " +
      "Closing #744; #743 is canonical.",
  },
];

const dryRun = process.argv.includes("--dry-run");

async function main() {
  if (dryRun) console.log("DRY RUN — no changes will be sent\n");

  for (const { number, comment } of closures) {
    console.log(`\n== Issue #${number} ==`);
    console.log(`Comment: ${comment.slice(0, 80)}...`);

    if (dryRun) {
      console.log("(dry-run: would add comment and close)");
      continue;
    }

    await ghApi(`/issues/${number}/comments`, "POST", { body: comment });
    console.log("  Comment added");

    await ghApi(`/issues/${number}`, "PATCH", { state: "closed", state_reason: "not_planned" });
    console.log("  Closed");
  }

  console.log("\nDone.");
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});

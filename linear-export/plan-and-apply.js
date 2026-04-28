require("dotenv").config();
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.LINEAR_API_KEY;
if (!API_KEY) {
  console.error("Missing LINEAR_API_KEY in .env");
  process.exit(1);
}

const planFile = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!planFile) {
  console.error("Usage: node plan-and-apply.js plan.md [--dry-run]");
  process.exit(1);
}

const issueQuery = `
  query Issue($id: String!) {
    issue(id: $id) {
      id
      identifier
      title
      description
      priority
      state { name }
    }
  }
`;

const updateMutation = `
  mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        id
        identifier
        title
        description
        priority
      }
    }
  }
`;

const commentMutation = `
  mutation CreateComment($input: CommentCreateInput!) {
    commentCreate(input: $input) {
      success
      comment {
        id
        body
      }
    }
  }
`;

function mapPriority(v) {
  const x = v.toLowerCase();
  if (x === "none") return 0;
  if (x === "urgent") return 1;
  if (x === "high") return 2;
  if (x === "medium") return 3;
  if (x === "low") return 4;
  throw new Error(`Unknown priority: ${v}`);
}

async function gql(query, variables) {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await res.json();
  if (data.errors) {
    throw new Error(JSON.stringify(data.errors, null, 2));
  }
  return data.data;
}

function parsePlan(content) {
  const lines = content.split("\n");
  const entries = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    if (line.startsWith("- ISSUE:")) {
      if (current) entries.push(current);
      current = { issue: line.replace("- ISSUE:", "").trim() };
      continue;
    }

    if (!current) continue;

    const trimmed = line.trim();
    if (trimmed.startsWith("ACTION:")) {
      current.action = trimmed.replace("ACTION:", "").trim();
    } else if (trimmed.startsWith("VALUE:")) {
      current.value = trimmed.replace("VALUE:", "").trim();
    } else if (trimmed.startsWith("FILE:")) {
      current.file = trimmed.replace("FILE:", "").trim();
    }
  }

  if (current) entries.push(current);
  return entries;
}

function getContent(entry) {
  if (entry.file) return fs.readFileSync(entry.file, "utf8");
  return entry.value || null;
}

async function resolveIssue(issueRef) {
  const data = await gql(issueQuery, { id: issueRef });
  if (!data.issue) throw new Error(`Issue not found: ${issueRef}`);
  return data.issue;
}

function preview(label, before, after) {
  console.log(`\n=== ${label} ===`);
  console.log("\n--- BEFORE ---\n");
  console.log(before ?? "_empty_");
  console.log("\n--- AFTER ---\n");
  console.log(after ?? "_empty_");
  console.log("\n==============\n");
}

function makeRunLogPath() {
  const dir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return path.join(dir, `plan-run-${stamp}.json`);
}

async function main() {
  const plan = fs.readFileSync(planFile, "utf8");
  const entries = parsePlan(plan);

  if (!entries.length) throw new Error("No entries found in plan file");

  const runLog = {
    createdAt: new Date().toISOString(),
    dryRun,
    planFile,
    entries: []
  };

  const runLogPath = makeRunLogPath();

  console.log(`Loaded ${entries.length} plan entries`);
  console.log(`Log file: ${runLogPath}`);
  if (dryRun) console.log("DRY RUN ONLY — no changes will be sent");

  for (const entry of entries) {
    const issue = await resolveIssue(entry.issue);
    const content = getContent(entry);

    console.log(`\n== ${issue.identifier} ==`);
    console.log(`Action: ${entry.action}`);

    const logEntry = {
      issueRef: entry.issue,
      issueId: issue.id,
      identifier: issue.identifier,
      action: entry.action,
      file: entry.file || null,
      value: entry.value || null,
      before: {},
      after: {},
      result: dryRun ? "dry-run" : "pending"
    };

    if (entry.action === "priority") {
      const mapped = mapPriority(content);
      logEntry.before.priority = issue.priority;
      logEntry.after.priority = mapped;

      preview(`PRIORITY ${issue.identifier}`, String(issue.priority), String(mapped));

      if (!dryRun) {
        await gql(updateMutation, {
          id: issue.id,
          input: { priority: mapped }
        });
        logEntry.result = "applied";
      }
    } else if (entry.action === "title") {
      if (!content) throw new Error(`Missing VALUE or FILE for title on ${entry.issue}`);
      logEntry.before.title = issue.title;
      logEntry.after.title = content;

      preview(`TITLE ${issue.identifier}`, issue.title, content);

      if (!dryRun) {
        await gql(updateMutation, {
          id: issue.id,
          input: { title: content }
        });
        logEntry.result = "applied";
      }
    } else if (entry.action === "description") {
      if (!content) throw new Error(`Missing VALUE or FILE for description on ${entry.issue}`);
      logEntry.before.description = issue.description;
      logEntry.after.description = content;

      preview(`DESCRIPTION ${issue.identifier}`, issue.description, content);

      if (!dryRun) {
        await gql(updateMutation, {
          id: issue.id,
          input: { description: content }
        });
        logEntry.result = "applied";
      }
    } else if (entry.action === "comment") {
      if (!content) throw new Error(`Missing VALUE or FILE for comment on ${entry.issue}`);
      logEntry.after.commentBody = content;

      preview(`COMMENT ${issue.identifier}`, "_no existing comment preview_", content);

      if (!dryRun) {
        const result = await gql(commentMutation, {
          input: {
            issueId: issue.id,
            body: content
          }
        });
        logEntry.result = "applied";
        logEntry.commentId = result.commentCreate.comment.id;
      }
    } else {
      throw new Error(`Unsupported action "${entry.action}" on ${entry.issue}`);
    }

    runLog.entries.push(logEntry);
    fs.writeFileSync(runLogPath, JSON.stringify(runLog, null, 2));
  }

  console.log(`\nDone. Log written to ${runLogPath}`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});

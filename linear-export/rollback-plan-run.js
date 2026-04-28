require("dotenv").config();
const fs = require("fs");

const API_KEY = process.env.LINEAR_API_KEY;
if (!API_KEY) {
  console.error("Missing LINEAR_API_KEY in .env");
  process.exit(1);
}

const logFile = process.argv[2];
const dryRun = process.argv.includes("--dry-run");
const includeComments = process.argv.includes("--delete-comments");

if (!logFile) {
  console.error("Usage: node rollback-plan-run.js logs/plan-run-xxxx.json [--dry-run] [--delete-comments]");
  process.exit(1);
}

const updateMutation = `
  mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        id
        identifier
        title
      }
    }
  }
`;

const deleteCommentMutation = `
  mutation DeleteComment($id: String!) {
    commentDelete(id: $id) {
      success
    }
  }
`;

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

function preview(label, value) {
  console.log(`\n=== ${label} ===`);
  console.log(value ?? "_empty_");
  console.log("==============\n");
}

async function main() {
  const log = JSON.parse(fs.readFileSync(logFile, "utf8"));
  const entries = [...log.entries].reverse(); // reverse order for safer rollback

  console.log(`Loaded ${entries.length} log entries from ${logFile}`);
  if (dryRun) console.log("DRY RUN ONLY — no changes will be sent");

  for (const entry of entries) {
    console.log(`\n== ${entry.identifier} ==`);
    console.log(`Original action: ${entry.action}`);

    if (entry.result !== "applied") {
      console.log("Skipping (was not applied)");
      continue;
    }

    if (entry.action === "priority" && entry.before.priority !== undefined) {
      preview(`ROLLBACK PRIORITY ${entry.identifier}`, `Restore to ${entry.before.priority}`);
      if (!dryRun) {
        await gql(updateMutation, {
          id: entry.issueId,
          input: { priority: entry.before.priority }
        });
      }
      continue;
    }

    if (entry.action === "title" && entry.before.title !== undefined) {
      preview(`ROLLBACK TITLE ${entry.identifier}`, entry.before.title);
      if (!dryRun) {
        await gql(updateMutation, {
          id: entry.issueId,
          input: { title: entry.before.title }
        });
      }
      continue;
    }

    if (entry.action === "description" && entry.before.description !== undefined) {
      preview(`ROLLBACK DESCRIPTION ${entry.identifier}`, entry.before.description);
      if (!dryRun) {
        await gql(updateMutation, {
          id: entry.issueId,
          input: { description: entry.before.description }
        });
      }
      continue;
    }

    if (entry.action === "comment") {
      if (!includeComments) {
        console.log("Skipping comment rollback (use --delete-comments to remove comments)");
        continue;
      }

      if (!entry.commentId) {
        console.log("Skipping comment rollback (no commentId recorded)");
        continue;
      }

      preview(`DELETE COMMENT ${entry.identifier}`, `Comment ID: ${entry.commentId}`);
      if (!dryRun) {
        await gql(deleteCommentMutation, { id: entry.commentId });
      }
      continue;
    }

    console.log("Skipping unsupported rollback entry");
  }

  console.log("\nRollback complete.");
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});

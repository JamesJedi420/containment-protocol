require("dotenv").config();
const fs = require("fs");

const API_KEY = process.env.LINEAR_API_KEY;

if (!API_KEY) {
  console.error("Missing LINEAR_API_KEY in .env");
  process.exit(1);
}

const args = process.argv.slice(2);

function getArg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

function hasFlag(name) {
  return args.includes(name);
}

const issueRef = getArg("--issue");
const field = getArg("--field");
const text = getArg("--text");
const file = getArg("--file");
const dryRun = hasFlag("--dry-run");

if (!issueRef || !field) {
  console.error(`Usage examples:

  node update-issue.js --issue SPE-126 --field priority --text medium
  node update-issue.js --issue SPE-126 --field title --text "New title"
  node update-issue.js --issue SPE-126 --field description --file SPE-126.md
  node update-issue.js --issue SPE-126 --field comment --file note.md
  cat note.md | node update-issue.js --issue SPE-126 --field comment
  node update-issue.js --issue SPE-126 --field description --file desc.md --dry-run
  `);
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

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => data += chunk);
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.resume();
  });
}

async function getContent() {
  if (file) {
    return fs.readFileSync(file, "utf8");
  }
  if (text) {
    return text;
  }
  if (!process.stdin.isTTY) {
    return await readStdin();
  }
  return null;
}

function preview(label, before, after) {
  console.log(`\n=== ${label} ===`);
  console.log("\n--- BEFORE ---\n");
  console.log(before ?? "_empty_");
  console.log("\n--- AFTER ---\n");
  console.log(after ?? "_empty_");
  console.log("\n==============\n");
}

async function main() {
  const issueData = await gql(issueQuery, { id: issueRef });
  const issue = issueData.issue;

  if (!issue) {
    console.error(`Issue not found: ${issueRef}`);
    process.exit(1);
  }

  const content = await getContent();

  if (field !== "priority" && !content) {
    console.error(`Field "${field}" needs --text, --file, or stdin`);
    process.exit(1);
  }

  if (field === "comment") {
    if (dryRun) {
      preview(`COMMENT on ${issue.identifier}`, "_no existing comment preview_", content);
      console.log(`Dry run only. No changes sent.`);
      return;
    }

    await gql(commentMutation, {
      input: {
        issueId: issue.id,
        body: content
      }
    });

    console.log(`Comment added to ${issue.identifier}`);
    return;
  }

  const input = {};

  if (field === "title") {
    if (dryRun) {
      preview(`TITLE for ${issue.identifier}`, issue.title, content);
      console.log(`Dry run only. No changes sent.`);
      return;
    }
    input.title = content;
  } else if (field === "description") {
    if (dryRun) {
      preview(`DESCRIPTION for ${issue.identifier}`, issue.description, content);
      console.log(`Dry run only. No changes sent.`);
      return;
    }
    input.description = content;
  } else if (field === "priority") {
    const mapped = mapPriority(content || text || "");
    if (dryRun) {
      preview(`PRIORITY for ${issue.identifier}`, String(issue.priority), String(mapped));
      console.log(`Dry run only. No changes sent.`);
      return;
    }
    input.priority = mapped;
  } else {
    console.error(`Unsupported field: ${field}`);
    process.exit(1);
  }

  await gql(updateMutation, {
    id: issue.id,
    input
  });

  console.log(`Updated ${issue.identifier}`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});

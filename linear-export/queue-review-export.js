require("dotenv").config();
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.LINEAR_API_KEY;
if (!API_KEY) {
  console.error("Missing LINEAR_API_KEY in .env");
  process.exit(1);
}

const args = process.argv.slice(2);
const issuesArg = getArg("--issues");
const fileArg = getArg("--file");
const outFile = getArg("--out") || "review-packet.md";

function getArg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

if (!issuesArg && !fileArg) {
  console.error(`Usage:
  node queue-review-export.js --issues SPE-126,SPE-924,SPE-921
  node queue-review-export.js --file review-list.txt
  node queue-review-export.js --issues SPE-126,SPE-924 --out packet.md
  `);
  process.exit(1);
}

function loadIssueRefs() {
  if (issuesArg) {
    return issuesArg.split(",").map(s => s.trim()).filter(Boolean);
  }

  const content = fs.readFileSync(fileArg, "utf8");
  return content
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !s.startsWith("#"));
}

const issueQuery = `
  query Issue($id: String!) {
    issue(id: $id) {
      id
      identifier
      title
      description
      priority
      createdAt
      updatedAt
      state { name }
      project { name }
      team { key name }
      labels {
        nodes { name }
      }
      comments(first: 50) {
        nodes {
          id
          body
          createdAt
        }
      }
      relations {
        nodes {
          type
          relatedIssue {
            identifier
            title
          }
        }
      }
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

async function resolveIssue(issueRef) {
  const data = await gql(issueQuery, { id: issueRef });
  if (!data.issue) throw new Error(`Issue not found: ${issueRef}`);
  return data.issue;
}

function formatIssue(issue) {
  const labels = issue.labels.nodes.map(l => l.name).join(", ") || "_None_";

  const relations = issue.relations.nodes.length
    ? issue.relations.nodes.map(r =>
        `- ${r.type}: ${r.relatedIssue?.identifier || ""} ${r.relatedIssue?.title || ""}`.trim()
      ).join("\n")
    : "_No relations_";

  const comments = issue.comments.nodes.length
    ? issue.comments.nodes.map(c => [
        `- ${c.createdAt}`,
        `${c.body || "_No body_"}`.trim()
      ].join("\n")).join("\n\n")
    : "_No comments_";

  return [
    `## ${issue.identifier} - ${issue.title}`,
    `- Team: ${issue.team?.name || ""}`,
    `- Project: ${issue.project?.name || ""}`,
    `- Status: ${issue.state?.name || ""}`,
    `- Priority: ${issue.priority}`,
    `- Labels: ${labels}`,
    `- Created: ${issue.createdAt}`,
    `- Updated: ${issue.updatedAt}`,
    ``,
    `### Description`,
    issue.description || "_No description_",
    ``,
    `### Relations`,
    relations,
    ``,
    `### Comments`,
    comments,
    ``
  ].join("\n");
}

async function main() {
  const issueRefs = loadIssueRefs();

  if (!issueRefs.length) {
    throw new Error("No issue refs provided");
  }

  const sections = [];
  sections.push(`# Review Packet`);
  sections.push(``);
  sections.push(`Generated: ${new Date().toISOString()}`);
  sections.push(`Issues: ${issueRefs.join(", ")}`);
  sections.push(``);

  for (const ref of issueRefs) {
    const issue = await resolveIssue(ref);
    sections.push(formatIssue(issue));
    sections.push(`---`);
    sections.push(``);
    console.log(`Fetched ${issue.identifier}`);
  }

  fs.writeFileSync(outFile, sections.join("\n"));
  console.log(`Wrote ${outFile}`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});

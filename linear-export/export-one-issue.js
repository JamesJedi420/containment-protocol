require("dotenv").config();
const fs = require("fs");

const API_KEY = process.env.LINEAR_API_KEY;
const issueId = process.argv[2];

if (!API_KEY) {
  console.error("Missing LINEAR_API_KEY in .env");
  process.exit(1);
}

if (!issueId) {
  console.error("Usage: node export-one-issue.js SPE-126");
  process.exit(1);
}

const query = `
  query Issue($id: String!) {
    issue(id: $id) {
      id
      identifier
      title
      description
      priority
      createdAt
      updatedAt
      state {
        name
      }
      project {
        name
      }
      team {
        key
        name
      }
      labels {
        nodes {
          name
        }
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

async function main() {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: API_KEY,
    },
    body: JSON.stringify({
      query,
      variables: { id: issueId }
    }),
  });

  const data = await res.json();

  if (data.errors) {
    console.error(JSON.stringify(data.errors, null, 2));
    process.exit(1);
  }

  const issue = data.data.issue;

  if (!issue) {
    console.error(`Issue not found: ${issueId}`);
    process.exit(1);
  }

  const labels = issue.labels.nodes.map(l => l.name).join(", ") || "_None_";

  const comments = issue.comments.nodes.length
    ? issue.comments.nodes.map(c => [
        `- ${c.createdAt}`,
        `${c.body || "_No body_"}`.trim()
      ].join("\n")).join("\n\n")
    : "_No comments_";

  const relations = issue.relations.nodes.length
    ? issue.relations.nodes.map(r =>
        `- ${r.type}: ${r.relatedIssue?.identifier || ""} ${r.relatedIssue?.title || ""}`.trim()
      ).join("\n")
    : "_No relations_";

  const markdown = [
    `# ${issue.identifier} - ${issue.title}`,
    `- Team: ${issue.team?.name || ""}`,
    `- Project: ${issue.project?.name || ""}`,
    `- Status: ${issue.state?.name || ""}`,
    `- Priority: ${issue.priority}`,
    `- Labels: ${labels}`,
    `- Created: ${issue.createdAt}`,
    `- Updated: ${issue.updatedAt}`,
    ``,
    `## Description`,
    issue.description || "_No description_",
    ``,
    `## Relations`,
    relations,
    ``,
    `## Comments`,
    comments,
    ``
  ].join("\n");

  const filename = `${issue.identifier}.md`;
  fs.writeFileSync(filename, markdown);
  console.log(`Wrote ${filename}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

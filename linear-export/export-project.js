require("dotenv").config();
const fs = require("fs");

const API_KEY = process.env.LINEAR_API_KEY;
const projectName = process.argv.slice(2).join(" ");

if (!API_KEY) {
  console.error("Missing LINEAR_API_KEY in .env");
  process.exit(1);
}

if (!projectName) {
  console.error('Usage: node export-project.js "Containment Protocol"');
  process.exit(1);
}

const projectQuery = `
  query Projects($term: String!) {
    projects(filter: { name: { containsIgnoreCase: $term } }, first: 10) {
      nodes {
        id
        name
        description
      }
    }
  }
`;

const issuesQuery = `
  query Issues($projectId: ID!, $after: String) {
    issues(
      filter: { project: { id: { eq: $projectId } } }
      first: 50
      after: $after
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
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
        team {
          key
          name
        }
        labels {
          nodes {
            name
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
    console.error(JSON.stringify(data.errors, null, 2));
    process.exit(1);
  }
  return data.data;
}

async function main() {
  // Step 1: resolve project
  const projectData = await gql(projectQuery, { term: projectName });
  const projects = projectData.projects.nodes;

  if (!projects.length) {
    console.error(`No project found matching: ${projectName}`);
    process.exit(1);
  }

  const project = projects[0];
  console.log(`Found project: ${project.name} (${project.id})`);

  // Step 2: paginate issues
  const allIssues = [];
  let after = null;
  do {
    const issueData = await gql(issuesQuery, { projectId: project.id, after });
    const page = issueData.issues;
    allIssues.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    console.log(`Fetched ${allIssues.length} issues...`);
  } while (after);

  // Build markdown
  const markdown = [
    `# Project: ${project.name}`,
    ``,
    `## Description`,
    project.description || "_No description_",
    ``,
    `## Issues (${allIssues.length})`,
    ``
  ];

  for (const issue of allIssues) {
    const labels = issue.labels.nodes.map(l => l.name).join(", ") || "_None_";
    const relations = issue.relations.nodes.length
      ? issue.relations.nodes.map(r =>
          `- ${r.type}: ${r.relatedIssue?.identifier || ""} ${r.relatedIssue?.title || ""}`.trim()
        ).join("\n")
      : "_No relations_";

    markdown.push(
      `### ${issue.identifier} - ${issue.title}`,
      `- Team: ${issue.team?.name || ""}`,
      `- Status: ${issue.state?.name || ""}`,
      `- Priority: ${issue.priority}`,
      `- Labels: ${labels}`,
      `- Updated: ${issue.updatedAt}`,
      ``,
      `#### Description`,
      issue.description || "_No description_",
      ``,
      `#### Relations`,
      relations,
      ``,
      `---`,
      ``
    );
  }

  const safeName = project.name.replace(/[<>:"/\\|?*]+/g, "-");
  const filename = `${safeName}.md`;
  fs.writeFileSync(filename, markdown.join("\n"));
  console.log(`Wrote ${filename}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

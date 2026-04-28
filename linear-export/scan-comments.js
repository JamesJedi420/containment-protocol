require('dotenv').config();

async function main() {
  const fetch = globalThis.fetch;
  const q = `query {
    issues(first: 250, orderBy: updatedAt) {
      nodes { identifier title updatedAt comments(first: 30) { nodes { id } } }
    }
  }`;
  const r = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': process.env.LINEAR_API_KEY },
    body: JSON.stringify({ query: q })
  });
  const d = await r.json();
  if (d.errors) { console.error(JSON.stringify(d.errors, null, 2)); return; }
  const issues = d.data.issues.nodes;
  const candidates = issues.filter(i => i.comments.nodes.length >= 2)
    .sort((a, b) => b.comments.nodes.length - a.comments.nodes.length);
  candidates.forEach(i => console.log(i.identifier + '\t' + i.comments.nodes.length + '\t' + i.title));
  console.log('\nTotal issues scanned:', issues.length);
}
main().catch(console.error);

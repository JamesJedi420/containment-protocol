/**
 * Materialize `docs/linear-external-documentation-follow-ups.md` from a
 * Linear `get_document` JSON payload (full object or `{ "content": "..." }`).
 *
 * Usage:
 *   node scripts/materialize-linear-external.mjs path/to/get_document.json
 *
 * Normalizes `<issue …>SPE-###</issue>` to `**SPE-###**`.
 */
import fs from "node:fs";

const p = process.argv[2];
if (!p) {
  console.error("Usage: node scripts/materialize-linear-external.mjs <get_document.json>");
  process.exit(1);
}
const j = JSON.parse(fs.readFileSync(p, "utf8"));
const body = j.content ?? j.data?.content;
if (typeof body !== "string") {
  console.error("JSON must include string `content`");
  process.exit(1);
}
const md = body.replace(/<issue id="[^"]*">([^<]+)<\/issue>/g, "**$1**");
const out = `# External documentation follow-up prompts

## Source

Git canonical copy (2026-05-12). Original: ${j.url ?? "(see Linear document)"}

Issue tags normalized to bold SPE identifiers.

${md}
`;
fs.writeFileSync("docs/linear-external-documentation-follow-ups.md", out, "utf8");
console.log("wrote docs/linear-external-documentation-follow-ups.md", out.length);

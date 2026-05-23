#!/usr/bin/env node
/**
 * Prepare batches for agent MCP posting loop until ALL_POSTED.
 * Usage: node scripts/harvest-linear-autopost-loop.mjs [batchSize]
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const batchSize = Number(process.argv[2] || 6);

const stats = spawnSync("node", [path.join(ROOT, "scripts/harvest-linear-autopost.mjs"), "stats"], {
  encoding: "utf8",
});
const s = JSON.parse(stats.stdout);
if (s.pending === 0) {
  console.log("ALL_POSTED");
  process.exit(0);
}

spawnSync("node", [path.join(ROOT, "scripts/harvest-linear-emit-batch.mjs"), String(batchSize)], {
  stdio: "inherit",
  cwd: ROOT,
});

console.log(
  JSON.stringify({
    ...s,
    instruction:
      "For each file in /tmp/harvest-post-queue/*.json: mcp Linear save_comment(issueId, body). Then: node scripts/harvest-linear-autopost.mjs mark-batch /tmp/harvest-post-queue-paths.json",
  }),
);

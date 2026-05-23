#!/usr/bin/env node
/** Write next unposted batch to /tmp/harvest-post-queue/NNN.json for MCP save_comment */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const size = Number(process.argv[2] || 10);
const outDir = "/tmp/harvest-post-queue";

const raw = spawnSync(
  "node",
  [path.join(ROOT, "scripts/harvest-linear-autopost.mjs"), "batch", "--size", String(size)],
  { encoding: "utf8" },
);
if (raw.stdout.trim() === "ALL_POSTED") {
  console.log("ALL_POSTED");
  process.exit(0);
}
const batch = JSON.parse(raw.stdout);
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, f));
const paths = [];
batch.forEach((entry, i) => {
  const file = path.join(outDir, `${String(i).padStart(3, "0")}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify({ issueId: entry.issueId, path: entry.path, body: entry.body }),
  );
  paths.push(entry.path);
});
fs.writeFileSync("/tmp/harvest-post-queue-paths.json", JSON.stringify(paths));
console.log(JSON.stringify({ count: batch.length, dir: outDir, paths }));

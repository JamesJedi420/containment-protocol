#!/usr/bin/env node
/**
 * Agent posting loop helper for harvest Linear retrofit.
 *
 * Commands:
 *   stats                          — { total, posted, pending }
 *   next                           — next unposted entry with body (or ALL_POSTED)
 *   batch [--size N]               — next N unposted entries with bodies
 *   mark <path>                    — mark one manifest path posted
 *   mark-batch <paths-json-file>   — mark array of paths posted
 *   generate-mcp [--limit N]       — write /tmp/harvest-mcp-all/*.json payloads
 *   read-mcp --start N --count M   — read generated MCP payload batch
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "planning/harvest-linear-retrofit/manifest.json");
const MCP_DIR = process.env.HARVEST_MCP_DIR || "/tmp/harvest-mcp-all";

function loadManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
}

function unposted(manifest = loadManifest()) {
  return manifest.filter((e) => !e.posted);
}

function withBody(entry) {
  return {
    ...entry,
    body: fs.readFileSync(path.join(ROOT, entry.path), "utf8"),
  };
}

const [cmd, ...rest] = process.argv.slice(2);

if (cmd === "stats") {
  const manifest = loadManifest();
  const posted = manifest.filter((e) => e.posted).length;
  console.log(JSON.stringify({ total: manifest.length, posted, pending: manifest.length - posted }));
} else if (cmd === "next") {
  const pending = unposted();
  if (!pending.length) {
    console.log("ALL_POSTED");
    process.exit(0);
  }
  console.log(JSON.stringify(withBody(pending[0])));
} else if (cmd === "batch") {
  const sizeIdx = rest.indexOf("--size");
  const size = sizeIdx >= 0 ? Number(rest[sizeIdx + 1]) : 10;
  const pending = unposted().slice(0, size);
  if (!pending.length) {
    console.log("ALL_POSTED");
    process.exit(0);
  }
  console.log(JSON.stringify(pending.map(withBody)));
} else if (cmd === "mark") {
  const rel = rest[0];
  if (!rel) {
    console.error("Usage: mark <path>");
    process.exit(1);
  }
  spawnSync("node", [path.join(ROOT, "scripts/harvest-linear-retrofit.mjs"), "--mark-posted", rel], {
    stdio: "inherit",
  });
} else if (cmd === "mark-batch") {
  const file = rest[0];
  const paths = JSON.parse(fs.readFileSync(file, "utf8"));
  const manifest = loadManifest();
  const set = new Set(Array.isArray(paths) ? paths : paths.map((p) => p.path ?? p));
  let n = 0;
  for (const e of manifest) {
    if (set.has(e.path) && !e.posted) {
      e.posted = true;
      n++;
    }
  }
  saveManifest(manifest);
  console.log("marked", n);
} else if (cmd === "generate-mcp") {
  spawnSync("node", [path.join(ROOT, "scripts/harvest-linear-generate-all-mcp.mjs"), ...rest], {
    stdio: "inherit",
  });
} else if (cmd === "read-mcp") {
  spawnSync("node", [path.join(ROOT, "scripts/harvest-linear-read-mcp-batch.mjs"), ...rest], {
    stdio: "inherit",
  });
} else {
  console.error(`Usage: node scripts/harvest-linear-autopost.mjs <${["stats", "next", "batch", "mark", "mark-batch", "generate-mcp", "read-mcp"].join("|")}>`);
  process.exit(1);
}

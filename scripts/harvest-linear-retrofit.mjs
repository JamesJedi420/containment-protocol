/**
 * Generate rich harvest retrofit Linear comments from planning/*-harvest.md.
 *
 * Usage:
 *   node scripts/harvest-linear-retrofit.mjs --generate
 *   node scripts/harvest-linear-retrofit.mjs --manifest
 *   node scripts/harvest-linear-retrofit.mjs --list-pending   # JSON lines for agent posting
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const HARVEST_GLOB_DIR = path.join(ROOT, "planning");
const OUT_DIR = path.join(ROOT, "planning/harvest-linear-retrofit/generated");
const MANIFEST_PATH = path.join(ROOT, "planning/harvest-linear-retrofit/manifest.json");

const TABLE_ROW =
  /^\|\s*(C\d+(?:\s*[–-]\s*C\d+)?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/;

function listHarvestFiles() {
  return fs
    .readdirSync(HARVEST_GLOB_DIR)
    .filter((f) => f.endsWith("-harvest.md"))
    .sort()
    .map((f) => path.join(HARVEST_GLOB_DIR, f));
}

function extractMeta(text) {
  const pick = (label) => {
    const m = text.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`));
    return m ? m[1].trim() : "";
  };
  return {
    source: pick("Source"),
    dedup: pick("Dedup"),
    repo: pick("Repo at triage"),
  };
}

function parseOwners(cell) {
  return [...cell.matchAll(/SPE-\d+/g)].map((m) => m[0]);
}

function normalizeVerdict(raw) {
  const v = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (v.includes("contradiction")) return "contradiction_check";
  if (v === "no_op" || v === "noop") return "no_op";
  if (v.includes("fold")) return "fold_in";
  if (v.includes("child")) return "new_child";
  if (v.includes("delta")) return "fold_in";
  return v;
}

function dispositionFor(verdict) {
  switch (verdict) {
    case "no_op":
      return {
        label: "no implementation change",
        reasoning:
          "Dedup or existing repo behavior covers this pattern; harvest row is traceability only. Shared-boundary test → no new child.",
      };
    case "contradiction_check":
      return {
        label: "no implementation change (guardrail)",
        reasoning:
          "Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.",
      };
    case "new_child":
      return {
        label: "child issue required",
        reasoning:
          "Harvest marked new child — bounded delivery with own slice/PR; do not fold acceptance into parent Goal.",
      };
    default:
      return {
        label: "fold-in",
        reasoning:
          "Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.",
      };
  }
}

function expandMechanic(note, verdict, meta) {
  const base = note.trim();
  const lines = [
    `- **Harvest summary:** ${base}`,
    `- **Pattern context:** Abstracted from batch source (${meta.source || "see harvest header"}).`,
  ];
  if (meta.repo) {
    lines.push(`- **Repo anchor:** ${meta.repo}`);
  }
  if (verdict === "contradiction_check") {
    lines.push(
      "- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.",
    );
  } else if (verdict === "no_op") {
    lines.push(
      "- **Runtime behavior:** No net-new mechanic required beyond what prior batches or listed modules already cover; keep for dedup traceability.",
    );
  } else {
    lines.push(
      "- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.",
    );
  }
  if (base.includes("`")) {
    lines.push(`- **Named modules in note:** ${base.match(/`[^`]+`/g)?.join(", ") ?? "see note"}.`);
  }
  return lines.join("\n");
}

function boundaryBlock(verdict, meta, primary) {
  const out = [
    "Franchise names and imported source prose",
    "Implementing the entire harvest batch as a mandate",
    "Other SPE subsystems not listed as co-owners on the candidate row",
  ];
  if (meta.dedup) {
    out.push(`Duplicate scope covered elsewhere: ${meta.dedup.slice(0, 200)}${meta.dedup.length > 200 ? "…" : ""}`);
  }
  const inScope =
    verdict === "contradiction_check"
      ? ["Authoring guardrails and acceptance notes on " + primary]
      : verdict === "no_op"
        ? ["None — doc traceability only"]
        : [
            "Concrete acceptance delta on " + primary + " when that issue's slice is implemented",
            "Co-owner consultation only where another SPE owns shared state",
          ];
  return { inScope, out };
}

function buildOwnerComment(batchId, owner, candidates, meta, partInfo) {
  const partNote = partInfo
    ? ` (part ${partInfo.part}/${partInfo.partsTotal})`
    : "";
  const title = `**Harvest retrofit (rich)** — \`${batchId}\` → **${owner}**${partNote}`;
  const sections = [
    title,
    "",
    "_Automated retrofit from `planning/" +
      batchId +
      "-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._",
    "",
    "### Batch context",
    `- **Source:** ${meta.source || "(see harvest doc)"}`,
    meta.dedup ? `- **Dedup:** ${meta.dedup}` : "",
    meta.repo ? `- **Repo at triage:** ${meta.repo}` : "",
    `- **Candidates on ${owner}:** ${candidates.map((c) => c.id).join(", ")}`,
    "",
  ].filter(Boolean);

  for (const c of candidates) {
    const coOwners = c.owners.filter((o) => o !== owner);
    const disp = dispositionFor(c.verdict);
    const b = boundaryBlock(c.verdict, meta, owner);
    sections.push(
      `---`,
      "",
      `#### ${c.id} — ${c.note.split(/[.(]/)[0].slice(0, 80)}`,
      "",
      "**1. Candidate & source**",
      `- **ID:** ${c.id}`,
      `- **Batch:** \`${batchId}\``,
      `- **Verdict:** ${c.verdict}`,
      "",
      "**2. Mechanic (agent-readable)**",
      expandMechanic(c.note, c.verdict, meta),
      "",
      "**3. Repo / subsystem anchor**",
      meta.repo ? `- ${meta.repo}` : "- See harvest doc header",
      `- **Table note:** ${c.note}`,
      "",
      "**4. Ownership & reconciliation**",
      `- **Primary (this comment):** ${owner}`,
      coOwners.length
        ? `- **Co-owners:** ${coOwners.join(", ")}`
        : "- **Co-owners:** none",
      "",
      "**5. Boundary**",
      "**In scope (when owner ships):**",
      ...b.inScope.map((x) => `- ${x}`),
      "",
      "**Out of scope:**",
      ...b.out.map((x) => `- ${x}`),
      "",
      "**6. Disposition & issue decision**",
      `- **Disposition:** ${disp.label}`,
      `- **Reasoning:** ${disp.reasoning}`,
      "",
      `**Traceability:** \`planning/${batchId}-harvest.md\` (${c.id})`,
      "",
    );
  }

  return sections.join("\n");
}

function parseHarvestFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const batchId = path.basename(filePath).replace(/-harvest\.md$/, "");
  const meta = extractMeta(text);
  const candidates = [];

  for (const line of text.split("\n")) {
    const m = line.match(TABLE_ROW);
    if (!m) continue;
    const [, id, verdictRaw, ownersRaw, note] = m;
    if (id === "ID" || id.startsWith("--")) continue;
    candidates.push({
      id: id.trim(),
      verdict: normalizeVerdict(verdictRaw),
      owners: parseOwners(ownersRaw),
      note: note.trim(),
    });
  }

  return { batchId, meta, candidates };
}

const MAX_COMMENT_CHARS = 19_500;

function chunkCandidates(rows, meta, batchId, owner) {
  const bodies = [];
  let chunk = [];
  for (const row of rows) {
    const trial = [...chunk, row];
    const size = buildOwnerComment(batchId, owner, trial, meta, null).length;
    if (chunk.length > 0 && size > MAX_COMMENT_CHARS) {
      bodies.push(chunk);
      chunk = [row];
    } else {
      chunk = trial;
    }
  }
  if (chunk.length) bodies.push(chunk);
  return bodies;
}

function generateAll() {
  if (fs.existsSync(OUT_DIR)) {
    fs.rmSync(path.join(ROOT, "planning/harvest-linear-retrofit/generated"), {
      recursive: true,
      force: true,
    });
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = [];

  for (const file of listHarvestFiles()) {
    const { batchId, meta, candidates } = parseHarvestFile(file);
    const byOwner = new Map();

    for (const c of candidates) {
      for (const owner of c.owners) {
        if (!byOwner.has(owner)) byOwner.set(owner, []);
        byOwner.get(owner).push(c);
      }
    }

    for (const [owner, rows] of byOwner) {
      const chunks = chunkCandidates(rows, meta, batchId, owner);
      chunks.forEach((chunkRows, partIndex) => {
        const partSuffix =
          chunks.length > 1 ? `.part-${partIndex + 1}-of-${chunks.length}` : "";
        const body = buildOwnerComment(batchId, owner, chunkRows, meta, {
          part: partIndex + 1,
          partsTotal: chunks.length,
        });
        const relDir = path.join("generated", owner);
        const outPath = path.join(ROOT, "planning/harvest-linear-retrofit", relDir);
        fs.mkdirSync(outPath, { recursive: true });
        const fileName = `${batchId}${partSuffix}.md`;
        const fullPath = path.join(outPath, fileName);
        fs.writeFileSync(fullPath, body, "utf8");
        manifest.push({
          batchId,
          owner,
          issueId: owner,
          part: partIndex + 1,
          partsTotal: chunks.length,
          candidateCount: chunkRows.length,
          path: `planning/harvest-linear-retrofit/${relDir}/${fileName}`,
          chars: body.length,
          posted: false,
        });
      });
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  const totalCandidates = manifest.reduce((s, m) => s + m.candidateCount, 0);
  console.log(
    JSON.stringify({
      batches: listHarvestFiles().length,
      ownerComments: manifest.length,
      candidateReferences: totalCandidates,
      manifest: path.relative(ROOT, MANIFEST_PATH),
    }),
  );
}

function listPending() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  for (const entry of manifest.filter((e) => !e.posted)) {
    const body = fs.readFileSync(path.join(ROOT, entry.path), "utf8");
    console.log(JSON.stringify({ issueId: entry.issueId, path: entry.path, chars: body.length }));
  }
}

const arg = process.argv[2];
if (arg === "--generate") generateAll();
else if (arg === "--manifest") {
  if (!fs.existsSync(MANIFEST_PATH)) generateAll();
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  console.log(JSON.stringify({ total: manifest.length, posted: manifest.filter((m) => m.posted).length }, null, 2));
} else if (arg === "--list-pending") {
  if (!fs.existsSync(MANIFEST_PATH)) generateAll();
  listPending();
} else if (arg === "--mark-posted") {
  const rel = process.argv[3];
  if (!rel) {
    console.error("Usage: --mark-posted planning/harvest-linear-retrofit/...");
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  let n = 0;
  for (const e of manifest) {
    if (e.path === rel || e.path.endsWith(rel)) {
      e.posted = true;
      n++;
    }
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  console.log("marked", n, rel);
} else if (arg === "--mark-posted-batch") {
  const batchFile = process.argv[3];
  if (!batchFile) {
    console.error("Usage: --mark-posted-batch /path/to/batch.json");
    process.exit(1);
  }
  const paths = JSON.parse(fs.readFileSync(batchFile, "utf8")).map((e) => e.path);
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const pathSet = new Set(paths);
  let n = 0;
  for (const e of manifest) {
    if (pathSet.has(e.path) && !e.posted) {
      e.posted = true;
      n++;
    }
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
  console.log("marked", n, "of", paths.length);
} else if (arg === "--next") {
  if (!fs.existsSync(MANIFEST_PATH)) generateAll();
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const next = manifest.find((e) => !e.posted);
  if (!next) {
    console.log("ALL_POSTED");
    process.exit(0);
  }
  const body = fs.readFileSync(path.join(ROOT, next.path), "utf8");
  console.log(JSON.stringify({ ...next, body }));
} else {
  console.error(
    "Usage: node scripts/harvest-linear-retrofit.mjs --generate|--manifest|--list-pending|--next|--mark-posted <path>",
  );
  process.exit(1);
}

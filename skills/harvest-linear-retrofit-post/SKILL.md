---
name: harvest-linear-retrofit-post
description: Use when posting pre-generated harvest retrofit comments to Linear from planning/harvest-linear-retrofit/manifest.json until posted equals total, or when the user asks to run the harvest autopost loop.
---

# Harvest Linear retrofit post loop

## Overview

Post **rich owner comments** already generated under `planning/harvest-linear-retrofit/generated/` to Linear via MCP. The manifest is the queue; **do not stop** until `stats.posted === stats.total` or `ALL_POSTED`.

Comment shape: `docs/harvest-fold-in-linear-comments.md` (six sections per candidate cluster).

## Prerequisites

| Check | Command / path |
| ----- | ---------------- |
| Generated bodies exist | `planning/harvest-linear-retrofit/generated/<SPE-####>/` |
| Manifest queue | `planning/harvest-linear-retrofit/manifest.json` |
| Linear MCP available | `save_comment` on server `Linear` |
| Branch context | Usually `docs/harvest-linear-mirror` (docs-only) |

Regenerate bodies if harvest mirrors changed:

```bash
npm run harvest:retrofit-generate
```

## Progress

```bash
node scripts/harvest-linear-autopost.mjs stats
# → { "total": 870, "posted": N, "pending": ... }
```

Success = `posted === total` or `--next` prints `ALL_POSTED`.

## Posting loop (required)

Repeat until `pending === 0`:

### 1. Prepare batch

```bash
node scripts/harvest-linear-emit-batch.mjs 6
```

Writes `/tmp/harvest-post-queue/000.json` … each with `{ issueId, path, body }`, and `/tmp/harvest-post-queue-paths.json` (path list).

If output is `ALL_POSTED`, go to **Finish**.

### 2. Post via Linear MCP (full body, no truncation)

For **each** file in `/tmp/harvest-post-queue/`:

- Tool: `save_comment`
- `issueId`: e.g. `SPE-854` (not a URL)
- `body`: entire `body` field from the JSON file

Prefer **5–8 parallel** `save_comment` calls per agent turn. On failure: log `issueId` + `path`, continue the queue.

**Do not** post from shell HTTP, WebSocket, or `mcp-remote` without Cursor auth — use agent `mcp_call_tool` only.

### 3. Mark manifest

Only after a successful `save_comment` for that entry:

```bash
node scripts/harvest-linear-autopost.mjs mark-batch /tmp/harvest-post-queue-paths.json
```

Or single path:

```bash
node scripts/harvest-linear-autopost.mjs mark planning/harvest-linear-retrofit/generated/SPE-16/...
```

### 4. Re-check stats

```bash
node scripts/harvest-linear-autopost.mjs stats
```

Then loop to step 1.

## Alternate: inline batch (no queue files)

```bash
node scripts/harvest-linear-autopost.mjs batch --size 6
```

Parse JSON array; `save_comment` each; `mark-batch` with collected paths.

## Parallel agents (optional)

If multiple agents post concurrently, **partition** unposted manifest entries into disjoint slices (e.g. write `/tmp/harvest-slices/slice-N.json` with `{issueId, path}` only). Each agent owns one slice; **never** two agents post the same `path`.

## Finish

1. Confirm `node scripts/harvest-linear-autopost.mjs stats` → `pending: 0`.
2. Comment on [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110): final `{ total, posted }` and PR/branch if applicable.
3. **Commit** updated `planning/harvest-linear-retrofit/manifest.json` (and `retrofit-tracker.md` if you edit it).

## Anti-patterns

| Do not | Do instead |
| ------ | ----------- |
| Mark `posted: true` before `save_comment` succeeds | Mark only after Linear returns a comment id |
| Truncate bodies to fit a turn | Post full markdown; chunking is already in generated files (`.part-N-of-M`) |
| Invent new `harvest-slice*.mjs` one-off posters | Use `emit-batch` + `autopost` + MCP |
| Skip manifest update at end of session | Commit manifest so the next agent sees true progress |
| Re-generate + post in one step without checking stats | `stats` first; regenerate only if harvest docs changed |

## References

| Doc / script | Role |
| ------------ | ---- |
| `planning/harvest-linear-retrofit/README.md` | Artifact layout |
| `planning/harvest-linear-retrofit/retrofit-tracker.md` | Backlog scope |
| `docs/harvest-candidate-triage-agent.md` | New batch triage (not this loop) |
| `scripts/harvest-linear-retrofit.mjs` | Generate bodies + manifest |
| `scripts/harvest-linear-autopost.mjs` | stats / batch / mark / mark-batch |
| `scripts/harvest-linear-emit-batch.mjs` | Queue files for MCP |
| `scripts/harvest-linear-autopost-loop.mjs` | Emit batch + print stats hint |

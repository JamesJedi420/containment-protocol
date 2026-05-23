# Harvest Linear retrofit (entire mirrored backlog)

**Purpose:** Rich agent-readable harvest records for all **42** mirrored batches in [`harvest-reconciliation-index.md`](../harvest-reconciliation-index.md) (~**3021** candidate references across owner issues).

## Generated artifacts

| Path | Description |
| ---- | ----------- |
| [`manifest.json`](manifest.json) | One entry per Linear comment to post (`issueId`, `path`, `chars`, `posted`) |
| [`generated/<SPE-####>/<batch-id>.md`](generated/) | Full six-section retrofit body per owner × batch (parts if chunked) |

Regenerate:

```bash
npm run harvest:retrofit-generate
```

## Posting to Linear

Each manifest entry maps to one **`save_comment`** on the owner issue (`issueId`). Bodies follow [`docs/harvest-fold-in-linear-comments.md`](../../docs/harvest-fold-in-linear-comments.md).

**Tracker:** [`retrofit-tracker.md`](retrofit-tracker.md)

Agents: post pending entries with Linear MCP `save_comment`, then mark posted:

```bash
node scripts/harvest-linear-autopost.mjs stats
node scripts/harvest-linear-autopost.mjs batch --size 10   # JSON with issueId + body
# → save_comment per entry
node scripts/harvest-linear-autopost.mjs mark <path>
```

Or one-at-a-time: `node scripts/harvest-linear-retrofit.mjs --next` (includes body).

Batch queue for MCP loop: `node scripts/harvest-linear-emit-batch.mjs 8` → files in `/tmp/harvest-post-queue/`, then `mark-batch` with `/tmp/harvest-post-queue-paths.json`.

## Policy

- **Retrofit** supersedes thin historical fold-ins for the same batch/owner; do not delete old comments.
- **New batches** use rich comments at adjudication time (no retrofit needed).
- Repo files remain canonical if Linear comment size limits apply; always commit `generated/` with the mirror PR.

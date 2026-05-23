# Harvest Linear retrofit tracker

**Scope:** All rows in [`harvest-reconciliation-index.md`](../harvest-reconciliation-index.md) (42 batches).

**Generated:** `npm run harvest:retrofit-generate` → see [`manifest.json`](manifest.json).

| Metric | Value |
| ------ | ----: |
| Harvest batches | 42 |
| Linear comments to post | 836 |
| Candidate references | 3021 |
| Unique owner issues | 89 |

## Status

| Phase | Status |
| ----- | ------ |
| Generate `planning/harvest-linear-retrofit/generated/**` | Done (regenerate on harvest doc edits) |
| Post all manifest entries to Linear | **In progress** (~40/870 posted — run `node scripts/harvest-linear-autopost.mjs stats`) |
| Expand mirror `Note` columns in `*-harvest.md` | Optional follow-up (generated bodies are source) |

## Posting progress

Update `posted` in [`manifest.json`](manifest.json):

```bash
node scripts/harvest-linear-retrofit.mjs --manifest
```

Returns `{ total, posted }`.

## Owner index (comments per issue)

Highest volume owners (plan multi-part posting first):

| Owner | Manifest entries |
| ----- | ----------------: |
| SPE-158 | 35 |
| SPE-1085 | 32 |
| SPE-854 | 32 |
| SPE-16 | 30 |
| SPE-562 | 28 |
| SPE-788 | 27 |
| SPE-151 | 25 |
| SPE-58 | 24 |
| SPE-35 | 23 |
| SPE-371 | 23 |

(Full list: `node -e "..."` on manifest — see script.)

## Agent instruction

1. Read `manifest.json` for entries with `"posted": false`.
2. Read `path`, post body to `issueId` via Linear MCP `save_comment`.
3. Mark posted; continue until `posted === total`.
4. Comment on [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110) with final counts.

# Planning archive

**Status:** frozen historical records. This is not a queue and not a source of current status. The live queue is [`../backlog.md`](../backlog.md); current lifecycle is Linear.

Moved from the planning root on 2026-11-03 in five verifier-safe batches. Filenames are unchanged.

| Bucket                       | Files | What it holds                                                                                                                                       |
| ---------------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`shipped/`](shipped/)       |   724 | Merged-and-shipped records, including done/closed rows and stale in-flight rows with shipped counter-evidence.                                      |
| [`superseded/`](superseded/) |     4 | Records replaced by a later umbrella or matrix; each carries a `Superseded` banner.                                                                 |
| [`harvest/`](harvest/)       |    44 | Historical pattern-harvest digests. The reconciliation index remains at [`../harvest-reconciliation-index.md`](../harvest-reconciliation-index.md). |

**Path rule:** `planning/<filename>` became `planning/archive/<bucket>/<filename>`. No file was renamed. The frozen [`../backlog-history-2026-11-01.md`](../backlog-history-2026-11-01.md) stays at the planning root because `backlog-handoff-manifest.json` uses it as `historyFile`.

**Manifest:** every moved path tracked by `sliceDocStatus` was rewritten in the same batch. `npm run verify:backlog-handoff` passed after each of the five batches and after the post-audit note.

**Harvest index:** 42 of the 44 harvest-classified files are table rows in the reconciliation index. `branch-continuity-harvest-reconciliation-slice-1.md` and `exploit-access-harvest-deferral-slice-1.md` are also slice records and are archived here without an index row.

**Per-file evidence:** [`../planning-corpus-audit.md`](../planning-corpus-audit.md) Appendix A classifies all 842 pre-migration files by state, group, and evidence. The audit remains the pre-migration record; §4.1 records this application.

**Batch order:** harvest 44 → superseded 4 → shipped 241 / 241 / 242.

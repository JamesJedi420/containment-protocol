# SPE-3488 — Google Drive bridge hygiene (skill + Story Knowledge migration)

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-3488](https://linear.app/spectranoir/issue/SPE-3488/google-drive-bridge-hygiene-skill-story-knowledge-migration) |
| **Related** | SPE-3487 |
| **Branch** | `jamesdyedbq/spe-3488-google-drive-bridge-hygiene-skill-story-knowledge-migration` |
| **Base main SHA** | `f441c41f98b882e816c98f6a894e5fdcc3e6871d` |

## Goal

Skill proactive/Sheets guidance; trash smoke Doc; migrate Story Knowledge into agent folder as single write home.

## Boundary

In:

- Skill + integration doc + keep-list wording
- `known-files.json` agent-folder ids; remove smoke Doc
- Copy Story Knowledge trio into agent folder; supersede pre-migration ids
- Trash Templates smoke Doc (agent-owned)

Out:

- Social Asset pack relocation (search remains discovery)
- Agent trash of pre-migration originals (`drive.file` 403 — human UI)

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Human trash of three pre-migration Story Knowledge files | human (Drive UI) | Agent cannot trash under `drive.file`; listed in `supersededPreMigration` |

## Validation

- Drive: list Story Knowledge folder (3 copies); smoke Doc trashed
- `npm run verify:backlog-handoff`

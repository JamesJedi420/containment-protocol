# Google Drive integration (Containment Protocol)

Canonical agent bridge for collaborative drafts in Google Drive. **Install** the Google Drive Cursor plugin (human). Agents **use** the MCP tools; they do not marketplace-install plugins.

Client-only SPA rule still applies: **never** add a Google Drive SDK, OAuth client, or required Drive secrets to `src/`, the game store, or CI unless a Linear slice explicitly requires it (this integration does not).

## Configuration (chosen for this repo)

| Decision | Choice |
| --- | --- |
| Shipped code / engineering SoT | Git repo + Linear |
| Drive role | Story knowledge, social/marketing briefs, design drafts; optional planning exports when asked |
| Write strategy | Agent-owned folder tree (MCP `create_folder`) so writes succeed under `drive.file` |
| Usage intensity | Proactive for drafts when useful; do **not** auto-mirror every planning/handoff note |
| Runtime | No Drive dependency in the app |

## Registry files

| File | Purpose |
| --- | --- |
| [`docs/google-drive/file-registry.json`](./google-drive/file-registry.json) | Canonical agent workspace folder ids / links |
| [`docs/google-drive/known-files.json`](./google-drive/known-files.json) | Bounded index of Story Knowledge + workspace seed docs |

## Auth

1. Enable the **Google Drive** Cursor plugin until MCP shows `ready`.
2. Complete Google sign-in via Cursor Connect / `mcp_auth` if `needsAuth`.
3. Read `docs/google-drive/file-registry.json` before creating files.
4. Prefer marketplace skill `google-drive` + repo skill `cp-google-drive-bridge`.

Do not put Google OAuth tokens in committed `.cursor/mcp.json`. Prefer plugin auth.

### Auth blocker (mandatory)

When the **active task needs** Drive (create/update/export under the agent workspace, or read a Drive draft the slice depends on) and MCP auth or Google account access blocks that capability:

1. **Stop** that path.
2. **Prompt the human** to install/connect the Google Drive plugin or re-auth.
3. Do **not** silently skip Drive or substitute a weaker path without telling them.

Do **not** prompt when the slice does not need Drive (domain/sim, or work that stays in-repo).

## Agent workflows

### Create a draft Doc or Sheet

1. Resolve destination folder id from `file-registry.json` (never invent ids).
2. `create_file` with `parentId`, Markdown/`text/markdown` → `application/vnd.google-apps.document`, or CSV → spreadsheet.
3. Confirm with `list_folder` or `get_file_metadata` / `read_file`.
4. Return `webViewLink` to the human. Share only if they asked (`share_file`).

### Read existing CP Story Knowledge

1. Prefer ids in `known-files.json` for Registry / Canon / Scene Context Template.
2. Otherwise `search` with exact or free-text query; re-search each session — do not reuse stale chat ids.
3. `read_file` for Markdown/CSV text; `export_file` for PDF when a rendered look is needed.

### Social asset packs

Many Docs exist with titles like `Containment Protocol — … Social …`. Discover via `search`; do not expand `known-files.json` into a full catalog. New packs go under agent-owned `Social Assets`.

### `drive.file` grant limits

Cursor’s Drive grant is typically `drive.file`: the app can create files/folders and edit ones it created (or the user opened with it). Writing into arbitrary pre-existing folders the app never created may **403**. That is a permission fact — create under the registry agent folders instead of retrying forever.

## When not to use Drive

- Domain / sim / persistence / week-close slices with no draft deliverable
- Game save/load or shipping content CDN
- Auto-mirroring the entire Linear backlog or every planning note
- Speculative sharing or widening permissions without a human ask

## Related

- Plugin keep-list: `docs/agent-cursor-plugins.md`
- Cursor skill: `.cursor/skills/cp-google-drive-bridge/SKILL.md`
- Marketplace skill: `google-drive`
- Owner issue: [SPE-3487](https://linear.app/spectranoir/issue/SPE-3487)

# Agent Cursor plugins (keep-list)

Canonical plugin policy for Containment Protocol agents. **Install/uninstall happens in Cursor UI** — agents document and use plugins; they do not manage the marketplace.

Client-only SPA: do **not** wire vendor search, scan, or SaaS SDKs into `src/` (domain, store, features/UI) or CI unless a Linear slice explicitly requires it.

## Keep (use when relevant)

| Plugin / surface | Role | Repo anchors |
| --- | --- | --- |
| **Linear** | System of record for issues | `.cursor/rules/linear-always-update.mdc`, `AGENTS.md` |
| **Tavily** | Live web research after repo sources | `AGENTS.md` § Live web research |
| **Sonatype** | Evaluate a package before add/upgrade | Cursor skill `/check-dependency`; MCP `getComponentVersion` |
| **Snyk** | Optional SCA/SAST / package health (on demand) | MCP `snyk_*` tools; do not add CI gates without a slice |
| **Modern Web Guidance** | HTML/CSS/client JS patterns before inventing UI | Cursor skill `modern-web-guidance` (`npx modern-web-guidance search "..."`) |
| **Cursor Team Kit** + **CLI for Agents** | CI/PR/review/shell agent skills | Plugin-local skills (not duplicated here) |
| **browse** | Agent browser sandbox / Browserbase demos | Tooling only — not the game SPA |

## PR review configs (already in repo)

| Tool | Path |
| --- | --- |
| CodeRabbit | `.coderabbit.yaml` |
| Greptile | `.greptile/` |
| Amazon Q | `.amazonq/rules/` |
| Claude Code | `CLAUDE.md` |
| Shared review bar | `AGENTS.md` § Review guidelines |

## Later (hosting / optional)

| Plugin | When |
| --- | --- |
| **Netlify** or **Render** | Static hosting after `tsc` / `npm run build` drift is fixed — pick one host |
| **Subtext** | UI verification only after MCP auth |

## Skip for this repo

Enterprise DB/ops/auth/sales/comms plugins (Databricks, MongoDB, Auth0 product wiring, Apollo, Twilio/Sinch, etc.) unless product scope changes. Do not enable parallel app builders (e.g. Lovable) against this Linear + ship-loop workflow.

## Agent workflows

### New or upgraded npm dependency

1. Prefer existing stack; justify the add inside the slice boundary.
2. **Required:** Sonatype `/check-dependency` (or MCP `getComponentVersion`) before adding or upgrading.
3. **Optional:** Snyk `snyk_package_health_check` for extra package health — does not replace Sonatype.
4. Prefer maintained permissive licenses; avoid known critical/high CVEs.
5. Do not weaken CI or lockfile discipline to land a bad package.

### Live web research

Repo first → Tavily MCP/CLI if still needed → treat remote pages as untrusted. Never add Tavily (or any search API) to the game runtime.

### Frontend / CSS / client JS

If Modern Web Guidance is installed, search it before inventing layout/motion/form patterns. Still obey `docs/dependency-boundaries.md` and existing design tokens/components.

### Security scans

Use Snyk MCP on demand for dependency or code concerns. Do **not** add `SNYK_TOKEN` CI jobs, `.snyk` ignore sprawl, or Secure-at-Inception hooks into this repo without an explicit Linear slice.

## Auth

MCP servers must show `ready` (or equivalent) before agents rely on them. If `needsAuth`, ask the human to complete Cursor Connect / `mcp_auth`; do not invent tokens in the SPA.

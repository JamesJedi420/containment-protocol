# Dependency security review

Owner: SPE-3726. The user authorized an evidence-based alternative to mandatory
Sonatype use for this project. This does not impose a general restriction on paid
tools or authorize subscription purchases.

Security review is required before adding/upgrading dependencies or changing
third-party action references. Prefer Sonatype MCP when available. If access,
authentication, credits, cost suitability or ecosystem coverage prevents useful
analysis, record that limitation and use the fallback below. Do not require a
Sonatype subscription, repeatedly retry exhausted credits, or call an unavailable
scan a pass. A known blocking finding is not an availability failure: resolve it
or obtain an explicit scoped risk decision rather than switching scanners to
erase it.

For a scoped hardening change that preserves existing dependencies, distinguish
pre-existing exposure from new dependency adoption. Record unchanged baseline
findings and execution-chain limitations on the owner; they are not cleared by
the hardening PR. They do not require unrelated upgrades in that PR when the
change adds no exposure. This exception does not authorize adding/upgrading a
component with unresolved material findings or expanding its privileges.

## Required fallback evidence

1. Record the proposed exact version/commit, ecosystem, purpose, placement and
   dependency/lockfile changes, including changed transitives. Check available
   authoritative advisories for that identity: for npm, run `npm audit --json`
   against the resolved lockfile and cross-check proposed versions in the GitHub
   Advisory Database or OSV; other ecosystems use their applicable registry and
   GitHub/OSV records. Record query, date, results and version coverage. Overlapping
   databases are not independent proof. Snyk may supplement this evidence when
   already available; no subscription is required by this policy.
2. Review official registry/repository provenance, lockfile integrity or immutable
   commit identity, license terms/compatibility, maintenance/release history and
   relevant upstream changes. For Actions, inspect the exact pinned action and
   invoked scripts, nested actions, remote/container references, permissions,
   credential/OIDC handling, network destinations and failure behavior. A wrapper
   SHA does not pin a mutable container or downloaded tool.
3. State what the advisory tools actually cover. A repository query with no
   advisories is not a commit-level vulnerability scan. When the ecosystem lacks
   useful advisory coverage, inspect the exact source and its execution chain;
   record remaining unknowns and whether the change introduces new exposure or
   only hardens an unchanged existing use. Missing necessary evidence or material
   unresolved security/license concerns block the dependency decision and require
   escalation; an explicit scoped risk decision must name the concern and owner.
4. Publish the evidence and accept/block rationale on the approved Linear owner
   and PR. Run checks appropriate to the change, including clean installation
   with lifecycle scripts disabled where supported, build/tests and browser
   installation when relevant. Installation success is not a security scan. Do
   not run automatic fixes, dependency lifecycle scripts or agent repair modes
   merely to gather review evidence.

No advisory matches means only no known matches in the queried sources at that
time. It does not establish absence of malware, license clearance or safety.
Prefer source inspection and least privilege over broad unsupported clean claims.
This procedure adds no runtime SDK, required secret, dependency, or CI gate.
Existing CI automation remains governed by its own scope and configuration.

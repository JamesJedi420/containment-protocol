# SPE-3432 — trusted Linear provider read-only probe

This is a bounded SPE-3432 operator procedure, **not** a Linear mutation writer.
The workflow only queries the GraphQL schema and emits sanitized operation/field
names. A successful run does **not** demonstrate provider-side atomic revision
preconditions, authorize Phase 4, or enable any write class.

## Trusted-host setup (requires authorized GitHub/Linear administrator)

1. In the repository GitHub Actions environments settings, create or inspect
   `linear-provider-probe`. Restrict deployment to the reviewed `main`
   branch, and configure any required environment reviewers.
2. In Linear, provision a **read-only**, team-restricted personal API key for the
   SpectraNoir workspace, with the minimum scope that permits schema
   introspection. Do not grant Write or Admin permissions. If the available
   credentials cannot be restricted appropriately, stop rather than weakening
   the boundary.
3. Store that key **only** as the `LINEAR_API_KEY` secret in the GitHub
   `linear-provider-probe` environment. Do not add it to repository variables,
   the repo source, a ChatGPT conversation, PR comments, issue descriptions,
   CI logs or artifacts.
4. After the workflow code has passed required review/CI and merged to
   `main`, start **SPE-3432 Linear Provider Read-only Probe** using
   `workflow_dispatch` on `main`. The workflow performs local negative
   fixtures first, then one authenticated introspection query using the
   hardcoded `https://api.linear.app/graphql` endpoint. GitHub's job uses
   `contents: read` only.
5. Retain the run URL, exact SHA and sanitized JSON result in SPE-3432 evidence.
   Do not copy or reveal token values. Failed authentication, partial GraphQL
   errors, unexpected schema, timeouts or missing secrets remain unverified.

## Evidence interpretation

The observed `issueUpdate` arguments and `IssueUpdateInput` field names
are **schema observations only**. An `updatedAt` field by itself is not proof
that the provider compares expected revisions atomically at commit time.

SPE-3432 remains BLOCKED_UNVERIFIED until an authorized, independently reviewed
provider-contract/concurrency experiment proves that one supported write class
enforces its required revision condition against a concurrent independent writer
(or an independently verified equivalent). That experiment must use a designated
nonproduction target, explicit authorization, and a trusted host with separate
writer credentials. The read-only probe cannot run that experiment and cannot
turn on mutations.

If no provider-enforced commit-time revision guarantee can be established,
unsupported mutation classes remain **disabled**, no outbox entry is deemed
applied, and any alternate design returns to the required governance phases.
SPE-3272 owns exact-request authorization; SPE-3432 consumes that decision and
owns trusted transport; SPE-3274 / SPE-3340 own their distinct pending/replay
channels. The GitHub workflow does not intercept external agent connectors.

## Local fixture check

`node scripts/governance/linear-provider-contract.check.mjs`

No key or network access is needed to run the negative fixtures. No enabled
write operation should be asserted from a passing fixture run.

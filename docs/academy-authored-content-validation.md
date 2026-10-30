# Academy authored-content validation (SPE-3304)

Deterministic, definition-only validator for Academy authored JSON under `academy/content/**`.

## Invocation

```bash
npm run verify:academy-authored-content
```

That script runs the validator against the production root, then the fixture suite in `scripts/validation/academy-authored-content.check.mjs`.

Optional override:

```bash
node scripts/validation/academy-authored-content.mjs --root path/to/content
```

## Content root

Production content lives at **`academy/content/**`**. This matches the `academy` change-class activation globs in `scripts/validation/validators.v1.json`. An absent or empty root is valid and exits `0`.

Non-JSON files under the root are ignored (documentation may sit beside content). Only discovered `*.json` files are candidates.

## Registered kinds (slice 1)

| Kind     | Container `kind` | Shared ID space     | Cross-refs                                      |
| -------- | ---------------- | ------------------- | ----------------------------------------------- |
| `course` | `course`         | `academy-stable-id` | `prerequisites` → course; `moduleRefs` → module |
| `module` | `module`         | `academy-stable-id` | `prerequisites` → module; optional `courseRef`  |

Each file is a JSON object:

```json
{
  "kind": "course",
  "records": [
    {
      "id": "course-foundations",
      "displayName": "Foundations",
      "prerequisites": [],
      "moduleRefs": []
    }
  ]
}
```

Stable IDs must match `[a-z0-9][a-z0-9-]*` unless a later kind declares a different pattern.

## Registering a new kind

Add a kind entry to the registry in `scripts/validation/academy-authored-content.mjs` (or call `registerContentKind` from a follow-up module imported by that file). Do not invent a second validator framework. Later SPE-3304 families remain deferred until their schemas exist.

## Diagnostics

One line per violation, deterministically ordered:

```text
<relative-path>:<line> — <rule> — <record-id or "file"> — <field-path>: <message>
```

Rules in slice 1: `unknown-kind`, `malformed-json`, `malformed-record`, `id-grammar`, `duplicate-id`, `dangling-reference`, `impossible-prerequisite`.

## Exit codes

| Code | Meaning                                   |
| ---- | ----------------------------------------- |
| `0`  | Valid content, empty root, or absent root |
| `1`  | One or more rule violations               |
| `2`  | Invalid invocation (bad flags)            |

## Definition-only guarantee

The validator never materializes runtime records, mutates authored files, advances storylines, or touches campaign / GameState. Failures are diagnostics only.

## Related

- Owner: [SPE-3304](https://linear.app/spectranoir/issue/SPE-3304)
- Slice boundary: `planning/spe-3304-authored-content-validator-slice.md`
- Registry selection: `scripts/validation/validators.v1.json` (`academy-authored-content`)

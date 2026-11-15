# SPE-780 — authored effect overlap

[SPE-780](https://linear.app/spectranoir/issue/SPE-780/effect-stacking-policy-schema) owns family-authored overlap policy. This pure contract accepts caller-supplied effect instances and an explicit policy, then proposes a deterministic result for strongest-only, duplicate rejection, duration extension, capped total, or an explicitly opposed pair. It provides no default policy, resource tuning, effect execution, duration ticking, or persistent state.

Each policy names the incoming family and rejects a mismatch. Strongest ties use stable effect IDs. Extension requires at most one existing instance and preserves its magnitude. Capping reports an effective total while retaining the separate instances and their durations. Opposed cancellation requires an explicitly named opposing family and at most one existing opposing instance; if none exists, the incoming effect is accepted. Ambiguous input fails closed instead of inventing a selection rule.

Synthetic tests demonstrate the policy cases and invalid input. They do not establish a live condition or gameplay consumer; SPE-2991 and other effect lifecycle owners remain responsible for their own integration.

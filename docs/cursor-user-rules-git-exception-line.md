# One-line paste — CP git exception (User Rules)

Paste this into **Cursor → Settings → Rules → User Rules** next to any generic "only commit when requested" rule:

```
For Containment Protocol implementation slices, follow repo implementation-lite ship loop (commit → push → open PR on the named branch); tracked .cursor/rules/implementation-lite.mdc applies (alwaysApply: true). Exception only when the user explicitly says no commit, no PR, local only, or plan only.
```

Full standing workflow: `docs/cursor-user-rules-snippet.md`.

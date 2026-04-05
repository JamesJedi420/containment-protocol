---
description: 'Use when working in src/features, src/styles, or src/components — React components, layout, Tailwind classes, copy, static content.'
applyTo: 'src/features/**, src/styles/**'
---

# UI Layer Rules

- Use Tailwind utility classes only. Do not write custom CSS unless the file lives in `src/styles/**`.
- Components are presentational — derive all game values from store selectors. Never compute sim logic inside a component.
- Do NOT import from `src/domain/sim/**` directly; use store selectors exposed by `src/app/store/**`.
- Copy and labels belong in the component file; no separate i18n layer is needed.
- Do not add or modify types in `src/domain/models.ts` from within a UI task — that is a blocking change requiring a separate task.

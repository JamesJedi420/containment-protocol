# Support

This document explains where to send questions, reports, and proposals about Containment Protocol.

## Filing an issue

Use the templates under [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/):

- **Bug** — something is implemented but behaves incorrectly. Include reproduction steps and expected vs. observed behavior.
- **Playtest Finding** — observations from a structured playtest session. Use the prompts and survey in [docs/playtest-prompts.md](docs/playtest-prompts.md). Apply a severity label.
- **Docs Gap** — missing, wrong, or unclear documentation. Link the doc you read and what you needed instead.
- **System Proposal** — a design proposal for new or changed simulation behavior. Include scope and bounded rules; expect design review before implementation.

If your report does not fit any template, use the closest match and explain in the body.

## Asking a question

For questions about how a system works, first check:

1. [docs/game-loop.md](docs/game-loop.md) — what happens during a week.
2. [docs/rules-and-objectives.md](docs/rules-and-objectives.md) — what the player is trying to do.
3. [docs/index.md](docs/index.md) — system map across the core loop.
4. [docs/glossary.md](docs/glossary.md) — terminology.
5. The relevant audit note under [docs/](docs/).

If your question is not answered, file a `Docs Gap` issue. That keeps documentation improving rather than answering each question in isolation.

If GitHub Discussions is enabled for the repository, open-ended questions, design discussions, and playtest reports may live there. The categories used (when present) are:

- Questions
- Playtest Reports
- Design Proposals
- Patch Notes

## Security

Do not file security issues in public templates. Follow [SECURITY.md](SECURITY.md).

## Out of scope here

- Account, billing, or hosting questions — Containment Protocol is a development project; no service is hosted.
- Third-party tooling support — see the upstream project for the tool in question.

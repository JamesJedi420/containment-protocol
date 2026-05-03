# Containment Protocol — Playtest Prompts

## Purpose

Stable prompt and survey structure for Containment Protocol playtests. The next playtest should not be improvised. Use the variants here, record findings against the severity labels, and file findings using the `Playtest Finding` issue template.

For the loop and objectives the prompts assume, see [game-loop.md](game-loop.md) and [rules-and-objectives.md](rules-and-objectives.md).

## How to use

1. Pick a prompt variant (short / medium / long) based on session length.
2. Send the prompt to the playtester before the session.
3. After the session, run the playtester through the survey questions.
4. File findings as issues using the severity labels below.
5. Link the playtest session in the resulting issues for traceability.

## Severity labels

Apply exactly one label to each finding:

- **blocker** — the build cannot be played past this point, or core loop integrity is broken.
- **major** — a system produces wrong, misleading, or unrecoverable behavior; player can continue but trust is damaged.
- **minor** — a noticeable issue with limited downstream impact; clear workaround exists.
- **polish** — friction, copy, layout, or affordance issue with no functional impact.
- **insight** — not a defect; a design observation worth recording for future planning.

## Prompt — Short (15–30 minutes)

> You are the director of a small containment agency. You will play one or two weeks of the simulation.
>
> For each week:
>
> 1. Read the open incidents and current pressure.
> 2. Decide which incidents to deploy against, and which to defer.
> 3. Pick teams, leaders, and loadouts; resolve any readiness blockers you can.
> 4. Advance the week and read the report.
>
> You do not need to win. Tell us:
>
> - what you understood
> - what confused you
> - what you wanted to do but could not
> - what you did not trust the simulation to do correctly

## Prompt — Medium (45–75 minutes)

> You are the director of a containment agency. Play four to six weeks of the simulation.
>
> Try to:
>
> - keep at least one team `mission_ready` every week
> - resolve at least one Containment Breach successfully
> - end the run with the agency in a recoverable state
>
> Between weeks, use the slow systems: queue training, start recruitment, procure gear, start research. Make plans that pay off later.
>
> After the session, tell us:
>
> - which decisions you made under guesswork instead of information
> - which reports you trusted and which you did not
> - where the simulation surprised you in a good way
> - where the simulation surprised you in a bad way
> - what you would change about the loop

## Prompt — Long (2+ hours, multi-session)

> You are the director of a containment agency. Run a sustained campaign across as many weeks as the build supports.
>
> Goals across the run:
>
> - test the institution's ability to absorb attrition over time
> - exercise training, recruitment, procurement, and research
> - take at least one major incident to its conclusion
> - try at least one strategy you do not expect to work, and report what happened
>
> Track across the run:
>
> - how readiness, support capacity, and pressure trend week over week
> - how often you can act on plan vs. react under emergency
> - how often the report explained an outcome you did not predict
> - how often you wanted information the build did not surface
>
> After the session, complete the survey below in full.

## Survey questions

Apply to all variants. Short variant may skip questions marked `(long)`.

### Loop legibility

1. Could you tell, at the start of each week, what mattered most?
2. Did the report explain why each outcome happened?
3. Were soft risks visible before you committed to a deployment?
4. Did pressure changes feel attributable to specific causes?

### Decision quality

1. Which decision in the run did you most regret? Why?
2. Which decision did you most trust? Why?
3. Were there decisions you made by guesswork because the build did not surface enough information?

### Systems integrity

1. Did any system produce a result you believe was wrong?
2. Did any system contradict another system?
3. Did the simulation reward strategies that should not have worked?
4. Did the simulation punish strategies that should have worked?

### Pacing and load

1. Did the weekly turn feel too long, too short, or right?
2. Did the slow systems (training, recruitment, research, procurement) feel meaningful?
3. (long) Across the run, did the institution feel like it grew, stagnated, or eroded?

### Onboarding and copy

1. Was anything in the UI labeled in a way you found unclear?
2. Did any term in a report require you to guess its meaning?
3. Did anything send you to documentation you could not find?

### Open

1. What is the one change that would most improve the next session?
2. What did you wish the simulation modeled that it does not?
3. (long) What kind of player do you think would most enjoy this build right now?

## Finding template

When filing a playtest finding, include:

- session date and prompt variant
- build identifier or commit
- severity label
- one-sentence summary
- exact reproduction steps when applicable
- expected vs. observed behavior
- screenshots or report-note text when relevant
- link to the survey response if separate

The `Playtest Finding` issue template under `.github/ISSUE_TEMPLATE/` enforces this structure.

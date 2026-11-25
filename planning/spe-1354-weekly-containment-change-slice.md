# SPE-1354 Weekly containment rating review

[SPE-1354](https://linear.app/spectranoir/issue/SPE-1354) owns the player-facing weekly review. James Dye is the Linear owner. Claim `CP-LANE-A-20261125-0443-RISK` reserves the containment-rating cue for native Codex session `01a2124e-4564-7911-8a90-92d356cfbb70` on `codex/spe-1354-weekly-containment-change` from MSI main `a52eca1e727a2ef178b5db070103ef8d89269a4b`. SPE-3752 returned ready with zero open PRs or drafts at 10:45:34 UTC on November 25.

At that base, `buildLatestReportView` omits containment movement. The existing `updateAgencyMetrics` in `src/domain/sim/advanceWeek.ts` emits `agency.containment_updated` before the report marker with the realized before and after ratings. Its raw delta precedes clamping. Funding or clearance can also trigger the same event.

Latest Report uses the existing report marker interval and the recorded week. It distinguishes incomplete history from a complete interval with no realized change. A material row names the week-close record, explains the rating's relevance to future candidate pools and links to the existing Recruitment surface. The event gives a net result. It does not identify which case caused the aggregate movement.

Reserved writes cover the existing Front Desk projection, page, test, CP smoke and this note. Acceptance covers real movement, capped and funding-only quiet, missing markers, exclusion outside the interval, and normal week close followed by cold reload. SPE-3348 selects validation. Other risk signals and broader weekly acceptance remain with their existing owners. SPE-1163 systemic risk, SPE-3181 containment deficiencies, SPE-1414 aftermath, SPE-1749, simulation, persistence, and the shipped digests are outside this slice. Release is separately serialized.

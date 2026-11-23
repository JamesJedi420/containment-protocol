# SPE-3369 — Operational staff post management

- Issue and owner. [SPE-3369](https://linear.app/spectranoir/issue/SPE-3369), Codex implementation boundary under [SPE-3134](https://linear.app/spectranoir/issue/SPE-3134).
- Branch `codex/operational-staff-post-management` from main `9e2df9e9c54a02c2fbd284eaa46808bdb8239098`.

Agency Command’s Operational staffing section links to the operational post assignments heading when hired staff are unassigned. `OperationalStaffingPanel` submits the rendered current post as the expected assignment. `AgencyPage` calls the corresponding SPE-3147 store command and renders fresh SPE-3135 capacity from the store. The command’s reason drives result announcements. Canonical assignments remain in the existing save state.

`projectOperationalStaffingView` accepts the optional validity result shipped in [SPE-3387 / #4304](https://github.com/JamesJedi420/containment-protocol/pull/4304). When supplied, the staffing panel shows the retained post, effective capacity and canonical facility reason through loss and recovery. Agency Command currently has no live authoritative facility-dependency packet. Its default path still shows occupancy capacity. The facility loss and recovery presentation test uses a constructed packet through the canonical resolver.

The current command contract exposes specialty qualification and assignment/occupancy validation. Staffing availability and authorization remain governed by their existing owners. The panel presents only reasons the canonical staffing commands and projections return.

Acceptance evidence comes from `src/features/agency/operationalStaffingView.test.tsx` and `e2e/operational-staffing.spec.ts`. Use the keyboard link or the remappable Manage operational posts action (Alt+Shift+M or standard controller button 7 by default) to reach the heading. Verify touch assignment, controller navigation and activation, reload, and keyboard unassignment. Compare effective capacity to the canonical result and confirm blocked commands announce the attempted post and leave the roster unchanged.

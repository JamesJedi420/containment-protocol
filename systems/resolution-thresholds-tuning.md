# Containment Protocol — Resolution Thresholds Tuning Spec

## Purpose

This document defines the tuning approach for mission resolution thresholds in Containment Protocol.

Resolution thresholds determine how the game converts mission inputs into bounded outcome bands such as:

- success
- partial success
- failure
- degraded follow-through
- contained failure
- escalating failure

These thresholds control where operational performance crosses from:

- viable to strained
- strained to degraded
- degraded to failing
- failing to campaign-damaging

This document is not the core mission resolution design spec.

It is the tuning reference for:

- readiness thresholds
- role and certification sufficiency thresholds
- bottleneck severity thresholds
- follow-through breakpoints
- fallout trigger bands
- how tolerant or unforgiving the system should feel

This spec is for:

- systems tuning
- balance iteration
- implementation parameterization
- QA result validation
- campaign feel review

---

## Design goals

Resolution thresholds should:

- make mission outcomes feel caused and legible
- preserve meaningful differences between strong, adequate, weak, and reckless preparation
- support partial success as a common and valuable result band
- make bottlenecks matter without making every gap an automatic failure
- create predictable consequences from institutional condition
- remain deterministic and inspectable
- support campaign-connected mission outcomes

Resolution thresholds should not:

- collapse all missions into pass/fail
- feel random or arbitrary
- punish minor imperfections with immediate failure too often
- hide critical breakpoints from player-facing explanation
- make strong preparation feel only marginally better than weak preparation

---

## 1. What a resolution threshold is

A resolution threshold is a bounded breakpoint where mission state crosses into a different outcome class.

Examples include:

- minimum viable readiness to deploy effectively
- role coverage level needed to avoid severe degradation
- support sufficiency needed for clean follow-through
- escalation level at which partial becomes likely
- bottleneck severity required to trigger added fallout
- weakness level at which clean success is no longer plausible

Resolution thresholds define how much imperfection the system tolerates before outcomes degrade.

---

## 2. Threshold philosophy

Resolution thresholds should reward competence, expose overreach, and keep degraded but salvageable outcomes common.

Preferred pattern:

```text
Strong preparation
-> success likely

Adequate but imperfect preparation
-> partial or success with degradation possible

Weak but still viable preparation
-> partial common, failure risk elevated

Critically weak preparation
-> failure or escalating failure likely
```

This means:

- the game should not expect perfection
- the game should punish obvious operational neglect
- the game should make the main bottleneck legible
- the game should preserve a useful middle band where partials teach the player how the system works

## 3. Main threshold classes

### 3.1 Deployment viability thresholds

These decide whether a mission is:

- clearly deployable
- deployable with degradation risk
- high-risk but allowed
- effectively blocked

**Inputs may include:**

- team readiness
- role coverage
- required certification
- access or asset presence
- hard mission requirement flags

**Tuning goal:**

The game should block only truly non-viable deployments and surface the rest as informed risk.

### 3.2 Outcome band thresholds

These determine whether the mission result lands in:

- success
- partial
- fail

**Inputs may include:**

- readiness quality
- role and certification sufficiency
- gear adequacy
- recon quality
- support condition
- escalation burden
- legitimacy or faction friction where relevant

**Tuning goal:**

Partial success should be common in imperfect but reasonable deployments.

### 3.3 Follow-through thresholds

These determine whether the result is:

- clean
- degraded
- broken

**Inputs may include:**

- support capacity
- specialist throughput
- coordination friction
- recovery burden
- mission-local extraction or stabilization needs

**Tuning goal:**

A mission may succeed yet still fail to resolve cleanly at the institutional level.

### 3.4 Fallout thresholds

These determine when extra cost, burden, or downstream harm appears.

**Inputs may include:**

- severe bottlenecks
- poor recon
- high escalation
- support shortage
- low readiness in a critical role
- visibility sensitivity
- legitimacy sensitivity

**Tuning goal:**

Fallout should become more likely as missions are pushed through weak conditions, not only when they outright fail.

## 4. Threshold bands

Resolution thresholds should generally be tuned in bounded bands.

### 4.1 Strong band

#### Description — Strong band

Mission conditions are comfortably above minimum viable thresholds.

#### Expected feel — Strong band

- success is common
- clean follow-through is plausible
- fallout is limited unless the mission itself is intrinsically dangerous

### 4.2 Adequate band

#### Description — Adequate band

Mission conditions are acceptable, but not cleanly ideal.

#### Expected feel — Adequate band

- success remains possible
- partials are credible
- one or two weaknesses may create degraded follow-through

#### Design importance — Adequate band

This should be one of the most common bands in normal play.

### 4.3 Strained band

#### Description — Strained band

Mission conditions are weak enough that bottlenecks meaningfully shape outcome.

#### Expected feel — Strained band

- partials become common
- degraded follow-through is likely
- fallout risk rises
- success usually requires strengths elsewhere compensating for weakness

### 4.4 Critical band

#### Description — Critical band

Mission conditions are near failure thresholds.

#### Expected feel — Critical band

- failure risk is high
- partial may still occur in bounded cases
- clean success should be rare
- severe fallout becomes plausible

#### Design rule — Critical band

Critical deployments should be obvious risks, not hidden traps.

## 5. Readiness thresholds

Readiness should be one of the clearest mission-quality signals.

**Desired tuning feel:**

- high readiness should materially improve outcome quality
- moderate readiness should be workable with good support and coverage
- low readiness should create visible degradation risk
- critically low readiness in the wrong context should strongly threaten mission quality

**Tuning guidance:**

Readiness thresholds should usually separate:

- cleanly ready
- deployable
- degraded
- unsafe

### Design rule — Readiness thresholds

Readiness should matter a lot, but should not be the only thing that matters.

A well-covered team with decent support may outperform a nominally stronger team missing critical capability.

## 6. Role and certification thresholds

Role and certification sufficiency should often act as threshold triggers rather than tiny invisible penalties.

**Desired tuning feel:**

- missing required coverage should matter sharply
- partial coverage should create identifiable degradation
- full relevant coverage should noticeably improve consistency

**Good behavior:**

- one missing non-critical role may degrade quality
- one missing critical role may trigger a severe bottleneck
- complete coverage should improve success and reduce avoidable fallout

### Design rule — Role and certification thresholds

This should be easy to explain in report notes and pre-deployment warnings.

## 7. Recon and information thresholds

Information quality should shift missions across outcome bands, especially in uncertainty-heavy scenarios.

**Desired tuning feel:**

- good recon reduces avoidable degradation
- incomplete recon keeps missions plausible but riskier
- poor recon should more often worsen fallout or partial outcomes than auto-fail the mission outright

**Good threshold pattern:**

- strong recon -> cleaner success band
- partial recon -> workable with caution
- poor recon -> elevated exposure and fallout risk
- no useful recon -> high degradation risk on recon-sensitive missions

### Design rule — Recon thresholds

Recon thresholds should mostly affect avoidable cost and clarity, not simply act as another abstract power number.

## 8. Support thresholds

Support thresholds should strongly shape follow-through quality.

**Desired tuning feel:**

- adequate support allows clean carry-through
- slight shortage may degrade outcome cleanliness
- repeated or severe shortage should worsen partial/fallout patterns
- support failure should be especially visible in post-contact stabilization or extraction-heavy missions

### Design rule — Support thresholds

Support thresholds should be one of the strongest reasons success becomes degraded rather than clean.

## 9. Specialist thresholds

Specialist thresholds should be narrower and more domain-specific than broad support thresholds.

**Desired tuning feel:**

- missing specialist support does not always stop deployment
- it often worsens throughput, recovery, or certain mission domains
- when specialist dependency is central, the threshold should be visible before commitment

**Example uses:**

- maintenance-sensitive recovery
- medical stabilization
- platform or asset operations
- doctrine or handling-sensitive lanes

### Design rule — Specialist thresholds

Specialist thresholds should create distinctive bottlenecks without multiplying complexity everywhere.

## 10. Escalation thresholds

Escalation should shift missions into harsher bands even when team quality is otherwise acceptable.

**Desired tuning feel:**

- low escalation leaves room for clean containment
- medium escalation makes degraded outcomes more common
- high escalation sharply narrows clean success windows
- critical escalation should compound with weak preparation, not just exist in isolation

### Design rule — Escalation thresholds

Escalation thresholds should make delay visibly expensive.

## 11. Weakest-link thresholds

Weakest-link logic is a core part of Containment Protocol’s identity and should be threshold-sensitive.

**Desired tuning feel:**

- one severe bottleneck should matter more than several minor imperfections
- not every weak point should dominate equally
- critical-role weakness should cross visible degradation thresholds quickly
- minor-role weakness should usually stay in softer penalty bands

### Design rule — Weakest-link thresholds

The player should often be able to answer:

- what was the real bottleneck?
- was it severe enough to cross the band?

## 12. Partial success threshold tuning

Partial success is one of the most important result bands in the game.

Partial should be common when:

- preparation is decent but incomplete
- support is strained
- recon is limited
- escalation is rising but not overwhelming
- the team is viable but not cleanly suited

Partial should be rare when:

- the mission is overwhelmingly favorable
- the mission is catastrophically mismatched

### Design rule — Partial success thresholds

If too many middle-quality missions become pure failure, the game becomes brittle.
If too many become clean success, the game becomes flat.

## 13. Failure threshold tuning

Failure thresholds should be meaningful but not trigger too early.

**Desired tuning feel:**

Failure should usually require one or more of:

- critical readiness weakness
- missing critical role/certification
- severe escalation
- severe support breakdown
- multiple compounding weaknesses
- deliberate player overreach

### Design rule — Failure thresholds

Failure should often feel like:

- a consequence of identifiable neglect
- a known risk the player accepted
- the result of compounding strain

It should rarely feel like the game suddenly flipping from “fine” to “lost” for unclear reasons.

## 14. Follow-through threshold tuning

Follow-through thresholds should often be separate from main result thresholds.

**Desired tuning feel:**

- strong operations can still produce degraded institutional outcomes under strain
- support and specialist weakness should appear here often
- this is where “success with cost” becomes legible

**Good pattern:**

- result: success
- follow-through: degraded

This preserves the campaign-management identity of the game.

## 15. Fallout trigger thresholds

Fallout should be triggered by threshold crossings that are easy to reason about.

**Common trigger patterns:**

- severe bottleneck crossed
- escalation above safe band
- support shortage active during a support-sensitive mission
- recon below safe band in a recon-sensitive mission
- visibility-sensitive mission resolved under legitimacy strain

### Design rule — Fallout trigger thresholds

Fallout should be common enough to matter, but not so universal that every mission feels equally dirty.

## 16. Good threshold patterns to use

### Pattern A — hard viability threshold, soft outcome thresholds

Use this when a mission truly requires some minimum condition to proceed.

### Pattern B — weighted middle band

Make the adequate/strained middle bands rich enough that many interesting missions live there.

### Pattern C — bottleneck override threshold

Allow one severe weakness to drag outcome quality sharply, especially when it is thematically central.

### Pattern D — separate follow-through banding

Let institutional weakness shape cleanliness after the main mission result is decided.

## 17. Bad threshold patterns to avoid

### Bad pattern 1: Tiny invisible gradients only

If everything is smooth and hidden, the player cannot learn.

### Bad pattern 2: All critical thresholds, no middle play

If every weakness is catastrophic, the game becomes rigid.

### Bad pattern 3: Pure additive softness

If missing key roles only causes mild penalties, role coverage loses meaning.

### Bad pattern 4: One universal mission score

If every mission uses the same blunt threshold without domain nuance, the system feels generic.

### Bad pattern 5: Outcome and follow-through collapsed together

If success always means clean and failure always means dirty, the institutional layer weakens.

## 18. Example conceptual threshold map

These are qualitative examples, not final numbers.

### Strong deployment

- good readiness
- complete role coverage
- required gear present
- adequate support
- manageable escalation

**Likely result:**

- success
- clean or mildly degraded follow-through

### Adequate deployment

- acceptable readiness
- one mild capability gap
- partial recon
- support close to threshold
- moderate escalation

**Likely result:**

- success or partial
- degraded follow-through plausible

### Strained deployment

- low-to-moderate readiness
- one meaningful bottleneck
- weak recon
- active support strain
- moderate/high escalation

**Likely result:**

- partial common
- fail plausible
- fallout likely

### Critical deployment

- severe readiness weakness or critical role gap
- strong support or coordination failure
- high escalation
- weak information

**Likely result:**

- fail likely
- partial only in bounded cases
- severe fallout risk

## 19. Surfacing requirements

Thresholds only work well if their effects are surfaced.

The player should be able to see:

- when a deployment is viable but degraded
- which bottleneck crossed the important line
- why partial became more likely than success
- why failure risk is now high
- what caused follow-through to break

**Good surfaced examples:**

- Missing certification coverage increases exposure risk
- Support shortage likely to degrade clean follow-through
- Escalation has narrowed clean containment options
- Low readiness in a critical role is the main deployment risk

## 20. QA and balancing review questions

Testing and tuning review should ask:

- are partials common enough in imperfect but reasonable deployments?
- are failures mostly tied to clear threshold crossings?
- do readiness, support, and role coverage all materially move outcomes?
- are bottlenecks visible enough to explain results?
- does strong preparation feel significantly better than merely adequate preparation?
- do critical risks feel explicit before deployment?

**Determinism testing should verify:**

- same input state -> same threshold band -> same result class
- threshold crossings behave predictably
- follow-through thresholds remain distinct from main outcome thresholds

## 21. Acceptance criteria

Resolution threshold tuning is working when:

- missions have meaningful middle-band outcomes
- bottlenecks change result quality in visible ways
- readiness, support, and role coverage materially affect thresholds
- weak but plausible deployments often produce partial rather than arbitrary failure
- critical weakness produces reliably harsher outcomes
- follow-through thresholds preserve institutional consequence after the main result
- the player can learn from repeated threshold crossings

## 22. Summary

Resolution thresholds in Containment Protocol should determine how preparation, strain, and bottlenecks turn into bounded mission outcomes.

They should:

- reward strong preparation
- preserve meaningful middle-band play
- make real bottlenecks matter
- separate mission result from follow-through quality
- keep outcomes deterministic and explainable

The player should feel:

I can tell when a plan is strong, when it is merely workable, and when I am pushing the institution past a line it may not survive cleanly.

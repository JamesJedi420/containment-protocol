# Multi-Key Access, Credential Failure, and Lock Networks (SPE-137)

## Purpose

**Access control** can require **multiple credentials**, **exact socket / order / placement**, and **progressive reconstruction** of hidden combinations. Wrong attempts may leave **persistent failure or disablement** states — not a boolean “locked until correct key.”

## Multi-key combinations

- Keys may be **logical AND**, **OR with quorum**, or **sequence-dependent**.
- **Socket / placement** — physical orientation of tokens, ritual diagram vertices, or USB-like port families.

## Progressive reconstruction

Agents may **partially learn** a combination across weeks: each success or near-miss reveals a **bounded hint** without auto-solving the whole graph.

## Persistent failure states

- **Burned socket** — wrong reagent fries the interface until repair mission.
- **Alarm latched** — further attempts require stealth or new credentials.
- **Cooldown lock** — deterministic delay before retry legal.

## Asymmetric entry vs return

**Outbound** and **return** credentials may differ (one-way seals, escorted entry, different ritual polarity). Document both legs explicitly.

## Ordinary credential carriers

Valid keys include **papers, badges, chapstick tubes, hymnals, shipping labels** — anything authored as a carrier with **provenance** and **fragility** (damage destroys key).

## Integration

- **SPE-112** — briefing may expose partial credential intel.
- **SPE-70** — false credentials feed deception and detection confidence.

## See also

- `architecture/deception-false-signals-counterplay.md` — SPE-74
- `architecture/pre-mission-query-budgets-briefing-intel.md` — SPE-112
- `architecture/fortified-site-breach-assault.md` — SPE-63

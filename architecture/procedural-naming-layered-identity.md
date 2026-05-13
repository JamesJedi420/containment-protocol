# Procedural Naming and Layered Identity Generation (SPE-76)

## Purpose

**Naming is not cosmetic flavor.** It is a **reusable deterministic framework** that emits **structured identity objects** for people, places, factions, and institutions — suitable for save stability, deduplication, localization hooks, and report legibility.

## Identity object shape

A generated identity should decompose into **layered components**, for example:

- **Personal** — given / chosen / operational call sign.
- **Family / lineage** — house, clan, patronymic, or institutional parent.
- **Title / role** — rank, office, or sanctioned role fragment.
- **Locational** — district, route, facility, or jurisdiction tag.
- **Secret or ritual name** — bounded second surface for doctrine, occult, or classified contexts.

Layers compose into **display stacks** with explicit precedence rules (what briefings show vs what archives store).

## Culture and domain modules

- **Morphology modules** — syllable inventories, affix rules, and forbidden combinations per culture or domain (civilian, military, occult, corporate, maritime).
- **Weighted output shapes** — control length distribution, consonant clusters, and “weight class” ( terse codename vs ceremonial full form ) from deterministic tables keyed by seed + context tags.

## Aliases and drift

- **Alias generation** — operational pseudonyms, casefile handles, and translation equivalents share the same kernel with different weight tables.
- **Deterministic drift** — optional week-scoped nickname evolution only when policy allows, never silent random renames mid-case without events.

## Pronunciation and readability aids

Lightweight aids (not full IPA engines):

- **Syllable stress hints** for TTS or narrator copy.
- **Disambiguation tokens** when collision risk is high (`Smith-7b`, “North Annex B”).
- **Readability caps** — max length, profanity filters, and institution-specific banned morphemes.

## Integration

- **SPE-58 / SPE-22** — names feed intel keys and provenance; avoid collapsing distinct entities.
- **Reports** — render stacks from structured objects, not raw regenerated strings when continuity matters.

## Anti-patterns

- Flat `displayName: string` as the only persisted identity for campaign-critical actors.
- Unseeded random generation that breaks reload parity.

## See also

- `architecture/background-packages-inherited-start-state.md` — SPE-83
- `architecture/knowledge-state-system.md` — SPE-58

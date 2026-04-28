Goal:
Implement a crisis-packet layer so authored events, escalating calendars, and entry variants can be attached to structured scenarios and delivered to both fresh and continuation player groups without rebuilding the underlying structure each time.

Scope:

* support named scenario events with triggering conditions, effect payloads, and state-transition hooks; events should be able to fire deterministically when calendar or condition windows are met rather than requiring manual narration scaffolding
* support event calendars as authored escalation schedules: nightmare onboarding, environmental pressure, rescue urgency, paranoia, ambush, infiltration, storm-break, siege, and climax as sequential phases that advance on fixed timeline unless interrupted by an operator action
* support day-and-night escalation beats where an adversary's plan advances on a fixed calendar unless the key interruption conditions are met; daily outputs including nightly abductions, framing attempts, lures, mob turns, and assault threats as valid event-controller outputs synchronized to the named schedule
* support weather, environmental phenomena, and prophecy synchronized to the same calendar so natural escalation, mythic pressure, and adversary action arrive as one coordinated timeline rather than separate independent tracks
* support prophecy fragments as both locally relevant information packets and signs in a longer multi-scenario chain; prophecy may also function as a long-horizon campaign scheduler that advances the wider narrative across multiple operational windows without operator micromanagement
* support spectacle events (talent shows, public rehearsals, performances, public celebrations) as civilian-concentration machinery: predictable staging, waiting, dispersal, and backstage windows; fragmented micro-spaces including locker rooms, dressing corridors, audience staging areas, and backstage pockets create supervision gaps that exploitable entries and separation maneuvers can leverage
* support institutions keeping event machinery running during an active threat: violent incidents inside a still-operating spectacle container are valid scenario configurations rather than edge cases requiring manual justification
* support heist generation through a stable skeleton covering mark, loot, location, catch, hitch, and payout; known obstacles and hidden hitches are authored as distinct layers so the immediate challenge and the complicating surprise remain legible to planners but arrive separately in play
* support staged objective replacement where one scenario deliberately replaces its active primary objective multiple times, including: courier work → voyage → castaway → false refuge → artifact retrieval → civil war → escape as a representative chain rather than an exhaustive taxonomy
* support multi-entry onboarding: fresh groups carry no prior inventory; continuation groups carry inventory, relationships, and decision history from earlier events; retroactive continuity overlays allow sequel operators to import prior events for groups that skipped earlier windows
* support divination procedures that generate countdown values populating live active clocks rather than acting as narrative-only lore outputs
* support session construction as a distinct toolkit from worldbuilding: dedicated generators for encounters, chase complications, side quests, skill challenges, environmental hazards, and travel complications are explicit scope inside this layer rather than downstream authoring concerns; side-objective generation works as a standard mid-session insertion surface
* support short horror cases as narrow packets: one monster class, one investigative twist, one release mechanism, and one failure logic per packet; anthology structure allowing a recurring guide to carry operators through several sequential cases; horror overlay as a configurable campaign profile controlling tone, pacing, and power ceilings
* support cooperative investigator loops centered on clue discovery, escalating threat, and race against a catastrophic-awakening endpoint
* support institution-backed expedition as a valid campaign spine: disputed discoveries dismissed by a civic establishment, funding pressure, and credential friction as structural features rather than incidental flavor
* support campaign cultures built from adaptation of historical or mythic material rather than generic setting defaults; worldview assumptions and protagonist identity expectations are first-class campaign configuration alongside map and faction data
* connect the layer to trigger execution, active clock, knowledge, investigation, and faction systems where those transitions need deterministic calendar or event delivery

Constraints:

* deterministic only
* no freeform narrative engine
* no assumption that events advance without authored calendar hooks
* no assumption that spectacle events automatically pause because of ambient threat
* no assumption that a single entry mode fits both fresh-start and continuation groups
* prefer compact authored packets with clear trigger conditions and effect payloads over sprawling bespoke event scripts
* keep calendar phase, escalation state, and objective replacement legible for debugging and content review

Acceptance criteria:

* at least one scenario uses a named escalation calendar that advances deterministically phase by phase unless interrupted
* at least one calendar event synchronizes weather, prophecy fragment, and adversary action to the same trigger window
* at least one spectacle event concentrates civilians into a predictable supervision-gap window that a subsequent encounter or extraction can exploit
* at least one institution keeps its event machinery running while an active threat is simultaneously resolved inside the same container
* at least one heist uses the six-part skeleton with known obstacles and hidden hitches in separate authored layers
* at least one scenario replaces its primary objective at least once through a staged objective-replacement chain
* at least one divination output populates a live countdown clock deterministically
* at least one session-construction generator produces an encounter, side quest, or complication without rebuilding from worldbuilding first
* at least one entry produces correct state for both fresh and continuation groups without manual reconciliation
* targeted tests cover deterministic calendar phase advancement, escalation interruption checks, entry variant branching, divination clock integration, and objective replacement transitions

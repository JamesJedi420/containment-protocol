Goal:
Implement the institution schema so religions, orders, cults, and similar bodies can be authored through one repeatable operational format instead of prose-only definitions.

Scope:

* support institution profiles covering doctrine, calendar, routine behavior, visual identity, permissions, major centers, suborders, and capability packages
* support umbrella institutions with rival sects, doctrinal schisms, regional branches, and semi-autonomous affiliated orders; affiliated-order libraries broad enough to model lobbying groups, purists, monster-intelligence societies, planar traveler networks, and other specialist organizations under the same schema
* support calendars that shape presence, availability, crowding, morale, and event timing through daily rites and observances; public performance events such as talent shows, rehearsals, and processions are valid institution-calendar outputs whose rehearsal, staging, and attendance structures materially reshape presence and vulnerability for a short window
* support order-first institutional denial where schools and comparable institutions answer repeated anomaly or death history through schedule preservation and event continuity rather than immediate causal investigation or shutdown; prior-disaster accumulation may normalize dysfunction, lowering shock response and preserving routine calendars even when the institution has become obviously unsafe by outside standards
* support public schooling, magical education, continuing study, and public ritual constraints where those belong to institution behavior; academy admission may include aptitude testing, interviews, fees, staged progression, and standardized curriculum modules covering physical training, theory, meditation, practicum, formula analysis, and laboratory work as reusable institutional modules
* support mobile clergy, concealed worship infrastructure, wandering sacred authority, and institution portability across distant or environment-separated domains; mobile clergy may operate as judges, recruiters, blessers, and intimidators without requiring fixed civic office; sacred infrastructure may include hidden shrines, wandering sites, and seasonal activation patterns rather than visible permanent temple grids
* support institution portability as explicit metadata about operational reach and recognition across regions and domains rather than assumed universal continuity
* support public institutions such as courts, assemblies, gymnasia, harbors, and civic religious offices as first-class scenario generators; named social and domestic spaces may switch behavior rules by mode, with participation, gender, status, and civic identity shaping what actions are permitted; visible markers such as uniform, emblem, and public role-signaling alter access and reaction inside those spaces
* support temple-like institutions operating simultaneously as worship space, market, public forum, archive, and secure deposit institution rather than one passive service node; recurring collection schedules and designated custodians govern how public offerings move into institutional custody
* support deity- or institution-specific priesthoods gated by bespoke conditions such as race, alignment, class background, behavior, apparel, weapons, or office expectations; granted powers remain distinct from ordinary spell access and unlock through sponsorship, role status, and office progression; nonhuman priesthoods and shamanic offices primarily structure NPC faction behavior; species-scoped pantheon packets coexist, conflict, borrow, or partially syncretize without collapsing into one universal doctrine layer; creator-line and divine-lineage splits justify subgroup divergence, inherited favor, disfavor, and interspecies hostility
* support spirit-intermediary offices as distinct from ordinary priests: community mediation, ancestor or spirit negotiation, narrower authority, different resource or hardship assumptions, and low-resource marginal conditions as part of the role definition rather than incidental biography
* support plans carrying formal metadata for approval, distribution, revision, and maintenance triggers; review events caused by leadership change, legal change, capability change, demographic shift, exercise results, or major incidents; post-publication socialization, training, and operator-facing quick-reference outputs as required follow-through rather than archival endpoints
* support cults and occult organizations through repeatable matrices covering public face, hidden structure, recruitment promises, corruption vectors, agendas, and influence domains; both overt organizations and hidden cells use the same core schema with different secrecy and social-reach assumptions
* support secret societies through repeatable schema covering symbol, membership type, history, methods, and stance toward the main anomaly pressure; trusted institutions may host parasite pipelines that recruit, compartmentalize, test, and quietly eliminate failed prospects while preserving a legitimate public face
* support occult politics as an ecosystem of resistance cells, dark cabals, mirror-orders, splinter factions, infiltrated institutions, and successor groups rather than one permanently coherent master conspiracy; reformist or benevolent institutions may generate hostile mirror-orders that retain the same structure while reversing purpose; benevolent resistance networks may fragment under pressure, corruption, infiltration, and defeat, producing rival or partially compromised descendants
* support benevolent performer networks as valid covert-aid structures with unusually broad civilian access rather than being forced into priestly or military cover only
* preserve symbolic-versus-operational leadership splits where charisma and practical command belong to different offices

Constraints:

* deterministic only
* no full theology simulator
* no monolithic one-faith-one-voice assumption for large institutions
* no assumption that religious infrastructure defaults to permanent visible temples
* prefer compact profile fields and linked branch or order records over sprawling narrative prose
* keep institution differences legible enough for downstream system use and authoring review

Acceptance criteria:

* at least one institution uses a repeatable schema covering doctrine, calendar, identity, and permissions
* at least one umbrella institution contains competing or divergent internal branches
* at least one affiliated order operates semi-autonomously under a parent institution
* at least one calendar event changes downstream availability or behavior deterministically; at least one public performance event creates a vulnerability window through predictable civilian concentration and fragmented supervision
* at least one institution answers a repeated anomaly or death history with schedule preservation and event continuity rather than investigation or shutdown
* at least one plan carries formal metadata with explicit maintenance triggers
* at least one cult or secret society is authored through the repeatable organizational schema
* at least one trusted institution hosts a parasite pipeline concealed behind a legitimate public face
* targeted tests cover deterministic profile loading, branch linkage, affiliated-order handling, calendar-driven effects, and occult-organization schema validation

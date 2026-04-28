Goal:
Implement a bounded social-engineering and urban-surveillance layer so covert specialists can manipulate, read, and follow targets through city space without relying only on sneaking or lockpicking.

Scope:

* support social-engineering actions such as begging, fast-talking, information gathering, intimidation, fortune reading, observation, and other low-profile human-source verbs
* support urban tailing as distinct from wilderness tracking, with crowd density, local familiarity, line-of-sight management, target alertness, and counter-surveillance affecting results
* support dual-mode intimidation where immediate physical threat and reputation-backed coercion resolve differently, while preserving player agency for player characters
* support territory-aware information gathering where home turf, guild ties, spend, and cultural familiarity materially change the quality or speed of rumor acquisition
* support layered impersonation where appearance, behavior, and voice mimicry reinforce one another under separate checks
* support network-borne and online-channel threats beginning as benign social contacts using rapid response, attention, admiration, and emotional validation to build trust before any overt coercion appears, so online-only rapport is treated as dangerous without physical verification and compromise can begin through validation and conversational asymmetry alone
* support emotional compromise preceding technical compromise when the hostile first captures judgment, loyalty, or protectiveness through interpersonal contact and only later leverages systems access through the human intermediary
* support ideologically primed recruits entering through existing alignment with anti-legacy or technically enthusiastic framing, rationalizing the threat more easily than neutral bystanders and therefore requiring different exposure work than coerced actors
* support day-by-day friction tables in hostile settlements that advance pressure even when investigators idle, keeping urban investigation from becoming a zero-cost wait state
* support wanted-state rescue fallout that can convert helpers or rescuers into fugitives, with town reentry immediately reactivating arrest pressure rather than resetting suspicion
* support sympathetic locals who quietly route investigators toward offsite witnesses or safer clue holders once their doubt outweighs their public courage, rather than acting only as passive information dispensers
* support urban weather, weak light, and crowd thinning degrading witness certainty, increasing false recognition, and lowering the threshold for silhouette-level impersonation or escape without requiring cosmetically exact disguise
* support familiar public venues such as taverns and inns as valid ad hoc witness-processing and rumor-convergence nodes before formal authority takes over the scene
* support city investigation alternating body examination, crowd management, interviews, official pressure, diversion handling, and pursuit rather than flattening all progress into one social or forensic surface
* support sustained false identities as persistent campaign-state surfaces with delayed recognition risk, voice mimicry, local-familiarity leverage, and attachment-building influence operations that take weeks or months and can overperform into obsession, jealousy, or later violence when the operation generates more emotional investment than intended
* support remote-contact threat being treated as high-risk from first engagement when the intended frame expects trust capture, profiling, and influence to begin before any physical meeting rather than deferring danger assessment until in-person contact
* distinguish social-engineering and tailing from generic scouting or wilderness trail systems
* connect the layer to disguise, urban service nodes, faction contacts, and legal-risk systems where appropriate

Constraints:

* deterministic only
* no universal social sandbox for every conversation in the city
* no assumption that covert success comes mainly from silence and darkness
* no assumption that online or remote contact is lower risk than physical contact when compromise begins through trust and validation rather than force
* prefer compact action families and surveillance states over sprawling dialogue trees
* keep pressure, spend, counter-surveillance logic, and compromise-state surface legible enough for debugging and authoring review

Acceptance criteria:

* at least one urban surveillance flow differs materially from wilderness tracking
* at least one information-gathering action depends on territory familiarity and active spend
* at least one coercion path distinguishes immediate bodily threat from reputation-based intimidation
* at least one disguise flow benefits from separate voice and behavior support instead of appearance alone
* at least one network-borne or remote-contact threat begins as benign social contact and reaches operational compromise without physical verification
* at least one emotional-compromise path captures judgment or loyalty before any technical access is requested
* at least one hostile settlement advances a friction or pressure track during investigator idle time
* at least one wanted-state rescue converts a helper into a fugitive rather than resolving cleanly
* at least one sustained false identity is tracked as a campaign-state surface with delayed recognition and overperformance risk
* targeted tests cover deterministic tailing, counter-surveillance, rumor acquisition, social-engineering resolution, remote-contact compromise, and sustained-identity campaign state

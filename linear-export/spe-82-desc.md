Goal:
Implement the compound specialist lane so analysis, antidotes, toxins, and consumable synthesis are owned by a clear specialist path instead of being scattered across generic crafting and medicine.

Scope:

* define a specialist lane for compound identification, contamination detection, antidote preparation, and bounded consumable manufacture
* support production rules with explicit cost, time, sample advantage, sourcing, and synthesis risk
* support cumulative toxin burden, delayed onset, partial neutralization, and limited-duration weapon payloads as reusable state flows
* support heuristic compound reading where context and partial cues such as color, storage position, local notes, residue, or container context improve confidence without granting instant perfect identification
* support specialist-only leverage from certain research or artifact assets where that lane should gain deeper utility than general operators
* support narrow material, thermal, chemical, or ritual vulnerability windows for anomaly classes that ignore ordinary weapons, keeping the specialist lane as the primary reliable counter for those families
* support ineffective-attack escalation rules where attacks that do not work may still worsen the situation by increasing aggression, changing target priority, or switching the entity from capture to kill behavior
* support route-specific hazard assessment that separates identification, exposure pathway, dose-response logic, and final risk characterization rather than collapsing everything into one contamination flag
* support route-specific mitigation and decontamination differentiated by population class and condition family, so reducing inhalation risk does not imply dermal or ingestion safety
* support forbidden laboratories as both lore nodes and hazard spaces, with villain specialty readable through tools, prototypes, residue, torture apparatus, failed subjects, and active experimental infrastructure
* support specialized anti-operator guardians that prioritize specific target classes such as psions, mediums, or other specialists as primary threats rather than treating all intruders equally
* support toxins, sedatives, and antidotes for identification, application, incapacitation, and nonlethal use rather than poison-as-damage only
* support specialist analysis distinguishing compounds by sight, smell, taste, symptoms, and remedy path under explicit rules instead of generic cure-item behavior
* support poison lifecycle distinguishing acquisition path, craft cost, delayed onset, duration, and mobility or function penalties
* support antidote timing and specificity as first-class resolution states, especially for creature-specific venoms and prepared compounds
* support recovery and cleansing specialist functions covering restoration, contamination detection, narrow-family detection verbs, and recovery support as role-defining parts of the lane
* connect the layer to medical-response, support-asset, and research systems where possible

Constraints:

* deterministic only
* no full item-crafting sandbox for every role
* no universal toxin access across all operators
* no assumption that ordinary weapons are broadly useful against all physical threats
* prefer compact compound families and explicit synthesis rules over giant recipe catalogs
* keep compound state, toxin burden, antidote dependency, and narrow-vulnerability window legible enough for planning and debugging

Acceptance criteria:

* at least one specialist lane explicitly owns compound analysis and antidote preparation
* at least one consumable family uses cost, time, and research gates for production
* cumulative toxin burden and partial neutralization are represented in a reusable flow
* at least one weapon-applied payload has bounded duration, potency window, or limited-use behavior
* at least one anomaly class ignores ordinary weapons but remains vulnerable to a specific material, chemical, thermal, or ritual counter owned by this specialist lane
* at least one ineffective attack worsens the situation rather than simply failing
* at least one hazard assessment separates identification, exposure pathway, and dose-response into distinct resolution steps
* at least one forbidden laboratory surfaces as both evidence of villain specialty and an active hazard space
* targeted tests cover deterministic identification, antidote application, toxin lifecycle, narrow-vulnerability windows, ineffective-attack escalation, and consumable production outcomes

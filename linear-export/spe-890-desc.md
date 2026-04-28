Goal:
Implement a bounded authority-interference layer so conventional police, sheriffs, and other non-anomalous officials can misclassify cases, detect false credentials, seize evidence, and turn investigators into suspects under ordinary law.

Scope:

* support conventional investigation misclassification that routes anomaly cases into murder, kidnapping, psychiatric, or other ordinary frames first
* support gray-zone access through forged credentials, reporter cover, family pretext, or social authority performance with detection risk
* support cover-identity failure through witness memory, record mismatch, payment trails, or repeated reuse
* support investigators becoming suspects when anomaly evidence is misread by conventional authorities
* support evidence seizure creating both clue loss and clue exposure to outside actors
* support authority-rich environments such as schools where the threat is embedded in a trusted adult role, so official presence prolongs threat lifespan through sincere institutional blindness and ordinary disciplinary framing rather than requiring explicit corruption
* support construction and excavation scenes inspectable only under ordinary-law risk, with police tape, trespass exposure, weapons scrutiny, and repeated-scene presence accumulating conventional attention before the anomaly is understood
* support social access through public-facing site events such as open houses, builder tours, and model-home visits as valid gray-zone infiltration paths for gathering site timeline, occupancy, and stakeholder clues
* support false evacuation notices and official-pretext covers becoming brittle when a target directly knows the claimed utility worker, authority figure, or reference person, with local familiarity defeating impersonation faster than document checks
* support truthful danger warnings failing when the messenger lacks family authority, professional credibility, or a plausible non-anomalous explanation for the threat
* support patrol interruption of field countermeasure work through ordinary patrols, trespass scrutiny, and weapons laws, with improvised contextual cover such as pranks or hazing defusing one encounter without stabilizing future suspicion
* support civilian suspicion accumulation for targets, anchors, and witnesses repeatedly connected to anomaly incidents even when they are victims rather than perpetrators
* support conventional responders misclassifying identity-duplicate attacks as domestic violence, ordinary assault, fraud, or mental instability when the impossible explanation falls outside their doctrine
* support anonymous tips as valid tools for redirecting conventional response into an incident without full anomaly disclosure, including the public-record risk that tip creates for investigators
* support crime-scene contamination fallout landing on civilian legal defense and third-party cases when investigators enter sealed scenes, not only on the investigator directly
* support forged federal credentials and gray-zone official identity access to secure evidence sites, with real-authority arrival creating a countdown after which the forged identity degrades quickly under records checks
* support clothing, manner, and institutional plausibility materially affecting how long a forged or gray-zone identity holds before detection, with evidence retrieval from secure sites able to turn into alarmed exfiltration rather than a static search scene
* distinguish authority interference from factional ideological opposition or high-level conspiracy alone
* connect the layer to legal-risk, evidence custody, and mission-pressure systems where relevant

Constraints:

* deterministic only
* no full police-procedural simulator
* no assumption that conventional authorities are passive scenery during anomaly investigations
* no assumption that authority presence in a location implies safety from embedded threats
* no assumption that cover-failure fallout lands only on the investigator and not on tied civilian cases
* prefer compact access-pretext and suspicion rules over sprawling law-enforcement prose
* keep current official suspicion, cover integrity, seized evidence state, and access outcome legible enough for planning and debugging

Acceptance criteria:

* at least one case is materially obstructed because authorities classify it through a conventional frame first
* at least one false or gray-zone credential access works briefly and then risks exposure
* at least one investigator becomes a suspect because evidence is misinterpreted by local authorities
* at least one evidence seizure changes both what the investigator loses and what the authority learns
* at least one authority-rich environment prolongs a threat through institutional blindness rather than explicit corruption
* at least one false official pretext fails because a local contact directly knows the claimed authority figure
* at least one civilian connected to anomaly incidents accumulates conventional suspicion despite being a target or witness
* at least one forged-credential access at a secure site creates a real-authority countdown and potential exfiltration sequence
* targeted tests or validation examples cover deterministic pretext access, suspicion escalation, evidence seizure, institutional-blindness prolongation, and cover-failure fallout routing

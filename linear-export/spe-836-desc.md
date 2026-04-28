Goal:  
Implement a bounded crisis-communication layer so incidents can deliver different messages to different audiences based on exposure, role, trust position, and time pressure instead of broadcasting one generic agency statement.

Scope:

* support audience segments such as directly affected civilians, near-zone civilians, internal staff and responder families, civic leaders, partner organizations, community intermediaries, media, and broader external observers
* support an incident-relationship priority ladder so the most exposed audiences receive action and safety messages before lower-immediacy observers
* support short action-oriented message tracks with different content emphasis by audience, including safety, restrictions, resource access, accountability, role clarity, and visible concern where relevant
* support restriction or burden messages paired with visible support and service-routing information rather than issuing constraints alone
* support trusted relay channels and feedback paths through community intermediaries rather than assuming direct agency reach is always strongest
* support timed briefing pressure where delayed updates can widen speculation or hostile framing
* support revision-aware first alerts that carry explicit markers for knowns, unknowns, instability, and expected next updates rather than presenting as settled fact
* support early-disclosure timing so the first audience contact preempts rumor even when information is incomplete
* support plain-language and localization adaptation by audience so messages are designed for real uptake through local terminology and cultural fit rather than technical precision alone
* support uncertainty disclosure as a message-track quality requirement by separating confirmed facts, working assumptions, unknowns, and investigation status explicitly
* distinguish audience-segmented communication from public warning delivery, partner-capacity modeling, and pure belief-state resolution alone
* connect the layer to public warning, incident impacts, partner coordination, and crowd-belief systems where relevant

Constraints:

* deterministic only
* no one-message-fits-all communication model
* no full media or sentiment simulator
* no assumption that restriction messages are complete without paired support or service-routing information
* prefer compact audience ladders and message-track rules over sprawling bespoke scripts
* keep audience priority, current message track, relay path, and first-alert revision state legible enough for planning and debugging

Acceptance criteria:

* at least one incident sends materially different communication tracks to more than one audience segment
* at least one most-exposed audience receives action-first messaging before a lower-priority audience
* at least one community intermediary or relay path changes communication reach, trust, or feedback quality
* at least one timed briefing delay changes downstream speculation, pressure, or response difficulty
* at least one first alert carries explicit revision markers for knowns, unknowns, and expected updates rather than presenting as settled fact
* at least one restriction message is paired with service-routing or support information rather than issued as a constraint alone
* targeted tests or validation examples cover deterministic audience segmentation, priority ordering, relay effects, timed briefing pressure, revision-aware first alerts, and support-attached messaging

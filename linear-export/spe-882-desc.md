Goal:
Implement a bounded symbolic-clue workflow so operators can capture, preserve, copy, decode, and later combine nonverbal clue fragments without assuming immediate full understanding.

Scope:

* support capture of symbolic clues through observation, copying, or recording with quality state
* support later translation or interpretation by qualified specialists rather than immediate universal readability
* support clues that remain operationally incomplete until combined with other fragments or later context
* support encoded archives and research notes that yield candidate theories with confidence levels rather than one certain answer until field testing resolves them
* support sensor-condition dependence such as light, angle, or inspection mode for clue visibility
* support encoded archives and clue objects that require decoding before full use
* support symbolic or indirect spatial language where location clues surface as monuments, metaphors, objects, or evocative images rather than direct coordinates, requiring contextual decoding before the clue becomes spatially actionable
* distinguish symbolic clue workflow from generic item pickup or ordinary text notes
* connect the layer to arc-state, evidence custody, and expert consultation systems where relevant

Constraints:

* deterministic only
* no universal auto-translation layer
* no assumption that seeing a clue once guarantees full later use
* no assumption that all useful information arrives in literal or directly mappable form
* prefer compact capture-quality and translation states over sprawling linguistics prose
* keep current clue state, capture quality, translation dependency, and hypothesis confidence legible enough for planning and debugging

Acceptance criteria:

* at least one symbolic clue is captured in partial form and only becomes useful after later interpretation or combination
* at least one clue can be missed or degraded because sensor conditions were inadequate
* at least one encoded archive requires decoding before operational use
* at least one research output yields candidate theories with confidence levels rather than one resolved answer
* at least one location clue arrives as symbolic or indirect spatial language requiring contextual interpretation before it becomes spatially actionable
* targeted tests or validation examples cover deterministic clue capture, persistence, translation, hypothesis confidence, symbolic-spatial decoding, and combination behavior

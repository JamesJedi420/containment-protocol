import { AGENCY_ESTABLISHMENT_BEAT_IDS } from './agencyEstablishmentProjection'
import { createTutorialRegistry } from './tutorialLifecycle'

export const AGENCY_ESTABLISHMENT_TUTORIAL = createTutorialRegistry([
  {
    id: 'agency-establishment',
    version: 1,
    kind: 'sequenced',
    allowBack: true,
    replayable: true,
    steps: AGENCY_ESTABLISHMENT_BEAT_IDS.map((id) => ({ id })),
  },
]).definitions[0]

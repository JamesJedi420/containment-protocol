/**
 * SPE-2913 / SPE-2998 — project the SPE-2932 facility section graph into
 * department-local workshop staging.
 *
 * `clinical_input_hold` classifies input. `clinical_output_hold` classifies
 * output. Direct spatial adjacency projects `adjacent` on that axis. A placed
 * department that is not directly adjacent projects `remote` on that axis.
 * A missing axis placement omits that axis. An incomplete pair is dropped so
 * week-close stays on the one-unit baseline. `clinical_hold` does not classify
 * either axis. This module does not persist a second topology store or add a
 * week-close hook.
 */

import { parseDepartmentLocalStaging } from './departmentLocalStaging'
import type { DepartmentLocalStaging } from './departmentLocalStaging'
import {
  FACILITY_INPUT_STAGING_LOCATION_ID,
  FACILITY_OUTPUT_STAGING_LOCATION_ID,
  FACILITY_PLACEMENT_DEPARTMENT_IDS,
  lookupDepartmentPlacement,
  lookupStagingLocationPlacement,
  queryDirectSpatialAdjacency,
  readProductionFacilitySectionGraph,
  type FacilitySectionGraph,
  type FacilityStagingLocationId,
} from './facilitySectionGraph'
import type { DepartmentWorkshopStaging } from './departmentWorkshopQueue'

function axisForPlacement(
  graph: FacilitySectionGraph | undefined,
  departmentNodeId: string,
  stagingLocationId: FacilityStagingLocationId
): DepartmentWorkshopStaging | undefined {
  const staging = lookupStagingLocationPlacement(graph, stagingLocationId)
  if (!staging) return undefined
  return queryDirectSpatialAdjacency(graph, departmentNodeId, staging.node.id)
    ? 'adjacent'
    : 'remote'
}

/**
 * Derive `DepartmentWorkshopStagingConditions` from a validated section graph.
 * Each axis comes from its own staging-location placement. A missing axis
 * placement omits that axis, and the incomplete department is dropped.
 * Unvalidated graphs and unplaced departments contribute nothing.
 */
export function projectFacilitySectionGraphOntoDepartmentLocalStaging(
  graph: FacilitySectionGraph | undefined
): DepartmentLocalStaging | undefined {
  const draft: Record<string, unknown> = {}
  for (const departmentId of FACILITY_PLACEMENT_DEPARTMENT_IDS) {
    const department = lookupDepartmentPlacement(graph, departmentId)
    if (!department) continue
    const inputStaging = axisForPlacement(
      graph,
      department.node.id,
      FACILITY_INPUT_STAGING_LOCATION_ID
    )
    const outputStaging = axisForPlacement(
      graph,
      department.node.id,
      FACILITY_OUTPUT_STAGING_LOCATION_ID
    )
    if (!inputStaging || !outputStaging) continue
    draft[departmentId] = { inputStaging, outputStaging }
  }
  return parseDepartmentLocalStaging(draft)
}

/** Production read path. Equal topology projects equal staging. */
export function projectProductionFacilitySectionStaging(): DepartmentLocalStaging | undefined {
  return projectFacilitySectionGraphOntoDepartmentLocalStaging(readProductionFacilitySectionGraph())
}

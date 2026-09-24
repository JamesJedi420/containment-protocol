/**
 * SPE-2913 — project the SPE-2932 facility section graph into department-local
 * workshop staging.
 *
 * One staging location (`clinical_hold`) classifies both input and output.
 * Direct spatial adjacency projects `adjacent` on both axes. A placed
 * department that is not directly adjacent projects `remote` on both axes.
 * Missing, rejected, or unresolved topology omits the department so week-close
 * stays on the one-unit baseline. This module does not persist a second
 * topology store or add a week-close hook.
 */

import { parseDepartmentLocalStaging } from './departmentLocalStaging'
import type { DepartmentLocalStaging } from './departmentLocalStaging'
import {
  FACILITY_PLACEMENT_DEPARTMENT_IDS,
  FACILITY_STAGING_LOCATION_IDS,
  lookupDepartmentPlacement,
  lookupStagingLocationPlacement,
  queryDirectSpatialAdjacency,
  readProductionFacilitySectionGraph,
  type FacilitySectionGraph,
} from './facilitySectionGraph'
import type { DepartmentWorkshopStaging } from './departmentWorkshopQueue'

const STAGING_LOCATION_ID = FACILITY_STAGING_LOCATION_IDS[0]

function axisForAdjacency(adjacent: boolean): DepartmentWorkshopStaging {
  return adjacent ? 'adjacent' : 'remote'
}

/**
 * Derive `DepartmentWorkshopStagingConditions` from a validated section graph.
 * Unvalidated graphs, a missing staging location, and unplaced departments
 * contribute nothing. Sibling departments without a placement stay omitted.
 */
export function projectFacilitySectionGraphOntoDepartmentLocalStaging(
  graph: FacilitySectionGraph | undefined
): DepartmentLocalStaging | undefined {
  const staging = lookupStagingLocationPlacement(graph, STAGING_LOCATION_ID)
  if (!staging) return undefined

  const draft: Record<string, unknown> = {}
  for (const departmentId of FACILITY_PLACEMENT_DEPARTMENT_IDS) {
    const department = lookupDepartmentPlacement(graph, departmentId)
    if (!department) continue
    const axis = axisForAdjacency(
      queryDirectSpatialAdjacency(graph, department.node.id, staging.node.id)
    )
    draft[departmentId] = { inputStaging: axis, outputStaging: axis }
  }
  return parseDepartmentLocalStaging(draft)
}

/** Production read path. Equal topology projects equal staging. */
export function projectProductionFacilitySectionStaging(): DepartmentLocalStaging | undefined {
  return projectFacilitySectionGraphOntoDepartmentLocalStaging(readProductionFacilitySectionGraph())
}

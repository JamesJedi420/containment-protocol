from pathlib import Path

path = Path('src/test/departmentWorkshopPersistence.test.ts')
text = path.read_text()

old_import = "import { createStartingState } from '../data/startingState'\n"
new_import = old_import + "import { BIOHAZARD_RESPONSE_FACILITY_ID } from '../domain/departmentWorkshopFacilityMapping'\n"
if text.count(old_import) != 1:
    raise SystemExit(f'Expected one starting-state import, found {text.count(old_import)}')
text = text.replace(old_import, new_import)

anchor = """const SNAPSHOTS: DepartmentWorkshopSnapshotRegistry = {
  'department:records-analysis': {
    departmentId: 'department:records-analysis',
    slotCapacity: 2,
    queued: [{ workOrderId: 'work:zulu', completedWork: 0 }],
    active: [],
    paused: [],
  },
  'department:biohazard-response': {
    departmentId: 'department:biohazard-response',
    slotCapacity: 1,
    queued: [],
    active: [{ workOrderId: 'work:alpha', completedWork: 1 }],
    paused: [],
  },
}
"""
replacement = anchor + """
const ACTIVE_BIOHAZARD_FACILITY_STATE = {
  facilities: {
    [BIOHAZARD_RESPONSE_FACILITY_ID]: {
      facilityId: BIOHAZARD_RESPONSE_FACILITY_ID,
      category: 'biohazard_response_lab',
      level: 1,
      maxLevel: 3,
      status: 'active' as const,
      effects: {},
    },
  },
}
"""
if text.count(anchor) != 1:
    raise SystemExit(f'Expected one workshop snapshot fixture, found {text.count(anchor)}')
text = text.replace(anchor, replacement)

first = """    const withWorkshops = {
      ...structuredClone(baseline),
      departmentWorkshopWorkOrders: WORK_ORDERS,
      departmentWorkshopSnapshots: SNAPSHOTS,
    }
"""
first_replacement = """    const withWorkshops = {
      ...structuredClone(baseline),
      facilityState: ACTIVE_BIOHAZARD_FACILITY_STATE,
      departmentWorkshopWorkOrders: WORK_ORDERS,
      departmentWorkshopSnapshots: SNAPSHOTS,
    }
"""
if text.count(first) != 1:
    raise SystemExit(f'Expected one persisted-workshops fixture, found {text.count(first)}')
text = text.replace(first, first_replacement)

second = """    const source = {
      ...baseline,
      departmentWorkshopWorkOrders: {
        'work:case-receipt': {
"""
second_replacement = """    const source = {
      ...baseline,
      facilityState: ACTIVE_BIOHAZARD_FACILITY_STATE,
      departmentWorkshopWorkOrders: {
        'work:case-receipt': {
"""
if text.count(second) != 1:
    raise SystemExit(f'Expected one case-receipt fixture, found {text.count(second)}')
text = text.replace(second, second_replacement)

path.write_text(text)

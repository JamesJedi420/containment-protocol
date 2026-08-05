from pathlib import Path

path = Path('src/test/departmentWorkshopPersistence.test.ts')
text = path.read_text()

first = """  it('processes persisted workshops once per week-close without changing the global queue', () => {
    const baseline = createStartingState()
    const withWorkshops = {
      ...structuredClone(baseline),
      facilityState: ACTIVE_BIOHAZARD_FACILITY_STATE,
      departmentWorkshopWorkOrders: WORK_ORDERS,
"""
first_replacement = """  it('processes persisted workshops once per week-close without changing the global queue', () => {
    const baseline = {
      ...createStartingState(),
      facilityState: ACTIVE_BIOHAZARD_FACILITY_STATE,
    }
    const withWorkshops = {
      ...structuredClone(baseline),
      departmentWorkshopWorkOrders: WORK_ORDERS,
"""
if text.count(first) != 1:
    raise SystemExit(f'Expected one workshop control fixture, found {text.count(first)}')
text = text.replace(first, first_replacement)

second = """  it('consumes completed workshop receipts into one case ledger once, without queue mutation', () => {
    const baseline = createStartingState()
    const caseId = Object.keys(baseline.cases).sort()[0]
    expect(caseId).toBeDefined()
    const before = structuredClone(baseline)
    const source = {
      ...baseline,
      facilityState: ACTIVE_BIOHAZARD_FACILITY_STATE,
      departmentWorkshopWorkOrders: {
"""
second_replacement = """  it('consumes completed workshop receipts into one case ledger once, without queue mutation', () => {
    const baseline = {
      ...createStartingState(),
      facilityState: ACTIVE_BIOHAZARD_FACILITY_STATE,
    }
    const caseId = Object.keys(baseline.cases).sort()[0]
    expect(caseId).toBeDefined()
    const before = structuredClone(baseline)
    const source = {
      ...baseline,
      departmentWorkshopWorkOrders: {
"""
if text.count(second) != 1:
    raise SystemExit(f'Expected one case-ledger fixture, found {text.count(second)}')
text = text.replace(second, second_replacement)

path.write_text(text)

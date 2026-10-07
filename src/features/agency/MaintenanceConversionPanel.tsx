import { useState } from 'react'
import type {
  MaintenanceConversionRequest,
  MaintenanceConversionResult,
} from '../../domain/facilityMaintenanceConversion'
import { MAINTENANCE_CONVERSION_EXPLANATIONS } from './facilityMaintenanceView'
import type { projectFacilityMaintenanceView } from './facilityMaintenanceView'

export function MaintenanceConversionPanel({
  conversion,
  onConvert,
}: {
  conversion: ReturnType<typeof projectFacilityMaintenanceView>['conversion']
  onConvert: (request: MaintenanceConversionRequest) => MaintenanceConversionResult
}) {
  const [staffId, setStaffId] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const selected = conversion.staff.find((staff) => staff.staffId === staffId)
  return (
    <div className="space-y-3" aria-labelledby="maintenance-conversion-heading">
      <h4 id="maintenance-conversion-heading" className="font-semibold">
        Prepare maintenance resources
      </h4>
      <p className="text-sm">
        Recipe: {conversion.recipe.staffCapacity} staff capacity + {conversion.recipe.stockQuantity}{' '}
        pressure-seal gasket → {conversion.recipe.maintenanceHours} maintenance hours /{' '}
        {conversion.recipe.partsReserve} parts reserve. Available gaskets:{' '}
        {conversion.stockQuantity}. Each staff member may convert once per campaign week.
      </p>
      <p className="text-sm opacity-80">
        Consumes a gasket otherwise available for direct pressure-seal repairs. Recovery requires a
        separate order.
      </p>
      <label className="block text-sm" htmlFor="maintenance-conversion-staff">
        Conversion staff member
      </label>
      <select
        id="maintenance-conversion-staff"
        className="select w-full max-w-lg"
        value={staffId}
        onChange={(event) => {
          setStaffId(event.target.value)
          setAnnouncement('')
        }}
      >
        <option value="">Select staff member</option>
        {conversion.staff.map((staff) => (
          <option key={staff.staffId} value={staff.staffId}>
            {staff.name}
          </option>
        ))}
      </select>
      <p id="maintenance-conversion-explanation" className="text-sm opacity-80">
        {selected?.explanation ??
          (conversion.staff.length
            ? 'Select a staff member to review eligibility.'
            : 'No canonical operational staff are available.')}
        {selected?.displacedUse &&
          ` Reserved use: ${selected.displacedUse}. Conversion does not cancel it.`}
      </p>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        disabled={!selected?.canConvert}
        aria-describedby="maintenance-conversion-explanation"
        onClick={() => {
          if (!selected) return
          const result = onConvert(selected.request)
          setAnnouncement(MAINTENANCE_CONVERSION_EXPLANATIONS[result.reason])
        }}
      >
        Convert gasket and staff time
      </button>
      <p role="status" aria-live="polite" aria-atomic="true" className="text-sm">
        {announcement}
      </p>
    </div>
  )
}

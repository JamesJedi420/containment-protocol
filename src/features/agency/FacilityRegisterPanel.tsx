import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import {
  FACILITY_REGISTER_COPY,
  type FacilityRegisterView,
} from './facilityRegisterView'

type FacilityRegisterPanelProps = {
  readonly register: FacilityRegisterView
}

export function FacilityRegisterPanel({ register }: FacilityRegisterPanelProps) {
  return (
    <article className="panel space-y-3" aria-labelledby="facility-register-heading">
      <h3 id="facility-register-heading" className="text-base font-semibold">
        {FACILITY_REGISTER_COPY.heading}
      </h3>
      <p className="text-sm opacity-80">{FACILITY_REGISTER_COPY.explanation}</p>
      {register.rows.length === 0 ? (
        <p className="text-sm opacity-60">{FACILITY_REGISTER_COPY.empty}</p>
      ) : (
        <ul className="space-y-2">
          {register.rows.map((row) => (
            <li
              key={row.instanceId}
              className="rounded border border-white/10 px-3 py-2"
              data-attention={row.attention}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{row.facilityId}</p>
                  <p className="text-sm opacity-70">
                    Type {row.typeReference} · Level {row.level}
                    {row.maxLevel !== null ? ` / ${row.maxLevel}` : ''} · Status {row.status}
                  </p>
                </div>
                <span className="text-sm opacity-70">{row.conditionLabel}</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm opacity-80">
                <li>
                  Output:{' '}
                  {row.outputSummary ?? FACILITY_REGISTER_COPY.unavailable}
                </li>
                <li>Staffing: {FACILITY_REGISTER_COPY.unavailable}</li>
                <li>Upkeep: {FACILITY_REGISTER_COPY.unavailable}</li>
                <li>
                  Structural integrity: {FACILITY_REGISTER_COPY.unavailable}
                </li>
                <li>
                  Site context:{' '}
                  <Link
                    to={
                      row.siteContext.kind === 'base'
                        ? APP_ROUTES.containmentSite
                        : APP_ROUTES.agency
                    }
                    className="btn btn-sm btn-ghost px-0"
                  >
                    {row.siteContext.label}
                  </Link>
                </li>
              </ul>
              {row.attentionReason ? (
                <output className="mt-2 block text-sm opacity-90">
                  Needs attention: {row.attentionReason}
                </output>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

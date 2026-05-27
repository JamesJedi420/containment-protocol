import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'

const CORE_COMMAND_SURFACES = [
  { href: APP_ROUTES.operationsDesk, label: 'Operations Desk' },
  { href: APP_ROUTES.report, label: 'Weekly Report' },
  { href: APP_ROUTES.cases, label: 'Cases' },
  { href: APP_ROUTES.teams, label: 'Teams' },
] as const

export default function HelpPlaceholderPage() {
  return (
    <section className="panel panel-support space-y-4" role="region" aria-label="Help">
      <h2 className="text-lg font-semibold">Help</h2>
      <p className="text-sm opacity-70">
        Bounded guidance index for core command surfaces. Use these entry points to move between
        operational planning, reporting, and field response without leaving the shell.
      </p>
      <nav aria-label="Core command surfaces" className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">
          Core command surfaces
        </p>
        <ul className="flex flex-wrap gap-2">
          {CORE_COMMAND_SURFACES.map((surface) => (
            <li key={surface.href}>
              <Link to={surface.href} className="btn btn-sm btn-ghost">
                {surface.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  )
}

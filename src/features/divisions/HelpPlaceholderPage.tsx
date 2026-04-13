import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'

export default function HelpPlaceholderPage() {
  return (
    <section className="panel panel-support space-y-3" role="region" aria-label="Help placeholder">
      <h2 className="text-lg font-semibold">Help</h2>
      <p className="text-sm opacity-70">
        This is a placeholder help surface. Contextual tutorials and system guidance can be added
        here without changing core simulation behavior.
      </p>
      <div>
        <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
          Back to Operations Desk
        </Link>
      </div>
    </section>
  )
}

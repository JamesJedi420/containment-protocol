import { Link } from 'react-router'
import { IconBack } from '../components/icons'

interface LocalNotFoundProps {
  title: string
  message: string
  backTo: string
  backLabel: string
}

export default function LocalNotFound({ title, message, backTo, backLabel }: LocalNotFoundProps) {
  return (
    <section className="space-y-4 rounded border border-white/10 p-4">
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm opacity-60">{message}</p>
      </div>

      <Link to={backTo} className="btn btn-sm btn-ghost">
        <IconBack className="h-4 w-4" aria-hidden="true" />
        {backLabel}
      </Link>
    </section>
  )
}

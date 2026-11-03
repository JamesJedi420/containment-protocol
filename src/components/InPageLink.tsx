import type { PropsWithChildren } from 'react'

export function InPageLink({
  targetId,
  className,
  children,
}: PropsWithChildren<{ targetId: string; className?: string }>) {
  return (
    <a
      href={`#${targetId}`}
      className={className}
      onClick={(event) => {
        if (import.meta.env.MODE !== 'pages') return
        // The URL fragment belongs to HashRouter on Pages, not the scroll target.
        event.preventDefault()
        const target = event.currentTarget.ownerDocument.getElementById(targetId)
        target?.scrollIntoView({ behavior: 'instant', block: 'start' })
        target?.focus({ preventScroll: true })
      }}
    >
      {children}
    </a>
  )
}

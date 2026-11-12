import type { PropsWithChildren } from 'react'
import { BrowserRouter, HashRouter } from 'react-router'

export function AppRouter({ children }: PropsWithChildren) {
  // Pages cannot rewrite deep paths to index.html; keep routes in the fragment.
  return import.meta.env.MODE === 'pages' ? (
    <HashRouter>{children}</HashRouter>
  ) : (
    <BrowserRouter>{children}</BrowserRouter>
  )
}

import React from 'react'
import { mountApplication } from './app/applicationRoot'
import App from './app/App'
import { AppRouter } from './app/AppRouter'
import { initializeErrorTracking } from './app/errorTracking'
import './index.css'

mountApplication(
  document.getElementById('root')!,
  <React.StrictMode>
    <AppRouter>
      <App />
    </AppRouter>
  </React.StrictMode>,
  initializeErrorTracking()
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { AppRouter } from './app/AppRouter'
import { initializeErrorTracking } from './app/errorTracking'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!, initializeErrorTracking()).render(
  <React.StrictMode>
    <AppRouter>
      <App />
    </AppRouter>
  </React.StrictMode>
)

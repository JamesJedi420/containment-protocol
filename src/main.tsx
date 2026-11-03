import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { AppRouter } from './app/AppRouter'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter>
      <App />
    </AppRouter>
  </React.StrictMode>
)

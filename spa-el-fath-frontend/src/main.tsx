import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './app/AppProvider'
import { AppErrorBoundary } from './components/ui/AppErrorBoundary'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

if ('serviceWorker' in navigator) {
  // Never let the browser HTTP cache serve an outdated worker; a new deploy must
  // be detected so the versioned runtime cache can be replaced.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => undefined)
  })

  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Reload once when control moves to a new worker. Session state lives in an
    // HttpOnly cookie, so a reload never signs the user out.
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  navigator.serviceWorker.ready.then(registration => {
    const promptUpdate = (worker: ServiceWorker | null) => {
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          worker.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    }
    promptUpdate(registration.waiting)
    registration.addEventListener('updatefound', () => promptUpdate(registration.installing))
  }).catch(() => undefined)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppErrorBoundary>
        <AppProvider>
          <App />
        </AppProvider>
      </AppErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)

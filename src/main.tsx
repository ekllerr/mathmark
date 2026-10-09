import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import useUIStore from './store/uiStore'

// the service worker keeps a copy of the app for offline use; the page learns here when that copy
// is ready, and when a newer version has been downloaded and is waiting for a reload
const update = registerSW({
  onOfflineReady: () => useUIStore.getState().setOffline({ kind: 'ready' }),
  onNeedRefresh: () => useUIStore.getState().setOffline({ kind: 'update', reload: () => update(true) }),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

const updateSW = registerSW({
  immediate: true,
  onOfflineReady() {
    window.dispatchEvent(new Event('pwa:offline-ready'))
  },
  onNeedRefresh() {
    window.dispatchEvent(
      new CustomEvent('pwa:update-ready', {
        detail: { updateSW },
      }),
    )
  },
  onRegisterError(error) {
    console.error('PWA register error:', error)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

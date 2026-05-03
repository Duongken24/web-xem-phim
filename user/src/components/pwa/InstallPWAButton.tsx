import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

type UpdateReadyEvent = CustomEvent<{
  updateSW: UpdateServiceWorker
}>

function isStandaloneDisplay() {
  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true
  )
}

export default function InstallPWAButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [updateSW, setUpdateSW] = useState<UpdateServiceWorker | null>(null)
  const [offlineReady, setOfflineReady] = useState(false)

  useEffect(() => {
    setIsInstalled(isStandaloneDisplay())

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    const handleUpdateReady = (event: Event) => {
      const customEvent = event as UpdateReadyEvent
      setUpdateSW(() => customEvent.detail.updateSW)
    }

    const handleOfflineReady = () => {
      setOfflineReady(true)
      window.setTimeout(() => {
        setOfflineReady(false)
      }, 3500)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('pwa:update-ready', handleUpdateReady as EventListener)
    window.addEventListener('pwa:offline-ready', handleOfflineReady)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('pwa:update-ready', handleUpdateReady as EventListener)
      window.removeEventListener('pwa:offline-ready', handleOfflineReady)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return

    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const handleRefresh = async () => {
    if (!updateSW) return

    await updateSW(true)
  }

  return (
    <>
      {offlineReady ? (
        <div className="fixed bottom-20 right-5 z-[60] rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-100 shadow-2xl shadow-black/30 backdrop-blur">
          Ứng dụng đã sẵn sàng dùng ngoại tuyến.
        </div>
      ) : null}

      {updateSW ? (
        <button
          type="button"
          onClick={handleRefresh}
          className="fixed bottom-5 right-5 z-[60] rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-2xl shadow-black/40 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-gray-950"
        >
          Cập nhật ứng dụng
        </button>
      ) : null}

      {!updateSW && !isInstalled && installPrompt ? (
        <button
          type="button"
          onClick={handleInstall}
          className="fixed bottom-5 right-5 z-[60] rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-2xl shadow-black/40 transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-950"
        >
          Cài ứng dụng
        </button>
      ) : null}
    </>
  )
}

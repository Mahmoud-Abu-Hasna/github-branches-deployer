import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { ToastContext, messageOf } from './useToast'

interface Toast {
  id: number
  message: string
}

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const showError = useCallback((message: string) => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 8000)
  }, [])

  useEffect(() => {
    function onRejection(event: PromiseRejectionEvent): void {
      console.error('Unhandled rejection:', event.reason)
      showError(messageOf(event.reason))
    }
    function onError(event: ErrorEvent): void {
      console.error('Uncaught error:', event.error ?? event.message)
      showError(messageOf(event.error ?? event.message))
    }
    window.addEventListener('unhandledrejection', onRejection)
    window.addEventListener('error', onError)
    return () => {
      window.removeEventListener('unhandledrejection', onRejection)
      window.removeEventListener('error', onError)
    }
  }, [showError])

  function dismiss(id: number): void {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showError }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map((t) => (
            <div key={t.id} className="toast">
              <AlertTriangle size={14} />
              <span>{t.message}</span>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => dismiss(t.id)}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

import { createContext, useContext } from 'react'

export interface ToastContextValue {
  showError: (message: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

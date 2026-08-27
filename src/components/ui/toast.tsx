import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, TriangleAlert, X } from 'lucide-react'
import { cn } from '../../lib/utils'

type ToastVariant = 'success' | 'error'

type ToastInput = { title: string; description?: string; variant?: ToastVariant }

type Toast = ToastInput & { id: number }

type ToastContextValue = {
  toast: (input: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const AUTO_DISMISS_MS = 4500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const removeToast = useCallback((id: number) => {
    setToasts(current => current.filter(item => item.id !== id))
  }, [])

  const toast = useCallback((input: ToastInput) => {
    const id = nextId.current++
    setToasts(current => [...current.slice(-3), { ...input, variant: input.variant ?? 'success', id }])
    window.setTimeout(() => removeToast(id), AUTO_DISMISS_MS)
  }, [removeToast])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(22rem,calc(100vw-2.5rem))] flex-col gap-2">
        {toasts.map(item => (
          <div
            key={item.id}
            role={item.variant === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-md border bg-[#252723] p-4 text-white shadow-xl',
              item.variant === 'error' ? 'border-[#e75f45]' : 'border-[#3a3d36]',
            )}
          >
            {item.variant === 'error'
              ? <TriangleAlert size={17} className="mt-0.5 shrink-0 text-[#e75f45]" aria-hidden="true" />
              : <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#8fb98b]" aria-hidden="true" />}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-snug">{item.title}</p>
              {item.description && <p className="mt-0.5 text-[12px] leading-snug text-[#c9cbc2]">{item.description}</p>}
            </div>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 text-[#9a9d92] transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-[#e75f45]/40"
              aria-label="Dismiss notification"
              onClick={() => removeToast(item.id)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}

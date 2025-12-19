import type { ReactNode } from 'react'

import { Toaster } from '@/components/Toaster'
import { ToastContext, useToastQueue } from '@/hooks/useToast'

type ToastProviderProps = {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const toast = useToastQueue()

  return (
    <ToastContext.Provider value={toast}>
      <Toaster messages={toast.messages} onDismiss={toast.remove}>
        {children}
      </Toaster>
    </ToastContext.Provider>
  )
}

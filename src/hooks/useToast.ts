import { createContext, useCallback, useContext, useState } from 'react'

export type ToastMessage = {
  id: string
  title: string
  description?: string
}

type ToastContextValue = {
  messages: ToastMessage[]
  push: (message: Omit<ToastMessage, 'id'>) => void
  remove: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToastQueue() {
  const [messages, setMessages] = useState<ToastMessage[]>([])

  const push = useCallback((message: Omit<ToastMessage, 'id'>) => {
    const id = crypto.randomUUID()
    setMessages((current) => [...current, { id, ...message }])
  }, [])

  const remove = useCallback((id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id))
  }, [])

  return { messages, push, remove }
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}

export { ToastContext }

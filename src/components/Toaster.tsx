import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'
import type { ReactNode } from 'react'

export type ToastMessage = {
  id: string
  title: string
  description?: string
}

type ToasterProps = {
  messages: ToastMessage[]
  onDismiss: (id: string) => void
  children?: ReactNode
}

export function Toaster({ messages, onDismiss, children }: ToasterProps) {
  return (
    <ToastProvider>
      {children}
      {messages.map((message) => (
        <Toast
          key={message.id}
          duration={4000}
          onOpenChange={(open) => {
            if (!open) {
              onDismiss(message.id)
            }
          }}
        >
          <div className="flex flex-col gap-1">
            <ToastTitle>{message.title}</ToastTitle>
            {message.description ? (
              <ToastDescription>{message.description}</ToastDescription>
            ) : null}
          </div>
          <ToastClose aria-label="Close">×</ToastClose>
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AuthProvider } from '@/auth/AuthProvider'
import App from '@/App'
import '@/index.css'
import { ConfigErrorPage } from '@/pages/ConfigErrorPage'
import { firebaseConfigError, firebaseConfigured } from '@/lib/firebase'
import { RepositoryProvider } from '@/lib/RepositoryProvider'
import { ToastProvider } from '@/components/ToastManager'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

const content = !firebaseConfigured && import.meta.env.DEV ? (
  <ConfigErrorPage missingKeys={firebaseConfigError} />
) : (
  <RepositoryProvider>
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  </RepositoryProvider>
)

createRoot(root).render(<StrictMode>{content}</StrictMode>)

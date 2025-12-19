import { createContext } from 'react'
import type { User } from 'firebase/auth'

type AuthContextValue = {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export type { AuthContextValue }
export { AuthContext }

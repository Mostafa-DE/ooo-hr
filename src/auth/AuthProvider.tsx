import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  GoogleAuthProvider,
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'

import { AuthContext, type AuthContextValue } from '@/auth/authContext'
import { useRepositories } from '@/lib/useRepositories'
import { auth } from '@/lib/firebase'
import { ensureUserProfile } from '@/usecases/ensureUserProfile'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => Boolean(auth))
  const { userRepository } = useRepositories()

  useEffect(() => {
    if (!auth) {
      return () => undefined
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user || !userRepository) {
      return
    }

    const authUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    }

    ensureUserProfile({ userRepository }, authUser).catch((caught) => {
      if (import.meta.env.DEV) {
        console.error('Failed to ensure user profile', caught)
      }
    })
  }, [user, userRepository])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async () => {
        if (!auth) {
          throw new Error('Firebase Auth is not configured')
        }
        const provider = new GoogleAuthProvider()
        await signInWithPopup(auth, provider)
      },
      signOut: async () => {
        if (!auth) {
          throw new Error('Firebase Auth is not configured')
        }
        await firebaseSignOut(auth)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

import type { UserRepository } from '@/lib/userRepository'

export type AuthUser = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

type EnsureUserProfileContext = {
  userRepository: UserRepository
}

export async function ensureUserProfile(
  context: EnsureUserProfileContext,
  user: AuthUser,
) {
  const email = user.email ?? ''
  const displayName = user.displayName ?? 'Employee'

  await context.userRepository.upsertUserOnLogin({
    uid: user.uid,
    email,
    displayName,
    photoURL: user.photoURL ?? null,
  })
}

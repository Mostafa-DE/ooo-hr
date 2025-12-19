import { describe, expect, it } from 'vitest'

import { getMissingFirebaseEnv } from '@/lib/firebase'

const baseEnv = {
  VITE_FIREBASE_API_KEY: 'key',
  VITE_FIREBASE_AUTH_DOMAIN: 'domain',
  VITE_FIREBASE_PROJECT_ID: 'project',
  VITE_FIREBASE_STORAGE_BUCKET: 'bucket',
  VITE_FIREBASE_MESSAGING_SENDER_ID: 'sender',
  VITE_FIREBASE_APP_ID: 'app',
}

describe('getMissingFirebaseEnv', () => {
  it('returns an empty array when all vars are present', () => {
    expect(getMissingFirebaseEnv(baseEnv)).toEqual([])
  })

  it('returns missing keys when vars are absent', () => {
    const missing = getMissingFirebaseEnv({
      ...baseEnv,
      VITE_FIREBASE_AUTH_DOMAIN: '',
      VITE_FIREBASE_STORAGE_BUCKET: undefined,
    })

    expect(missing).toEqual([
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_STORAGE_BUCKET',
    ])
  })
})

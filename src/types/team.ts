import type { Timestamp } from 'firebase/firestore'

type Team = {
  id: string
  name: string
  leadUid: string | null
  managerUid: string | null
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export type { Team }

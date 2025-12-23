import type { UserRepository } from '@/lib/userRepository'

type SetJoinDateContext = {
  userRepository: UserRepository
}

type SetJoinDateInput = {
  uid: string
  joinDate: Date
  currentJoinDate?: Date | null
}

export async function setJoinDate(
  context: SetJoinDateContext,
  input: SetJoinDateInput,
) {
  if (Number.isNaN(input.joinDate.getTime())) {
    throw new Error('Join date must be a valid date.')
  }

  if (input.currentJoinDate) {
    throw new Error('Join date is already set and cannot be changed.')
  }

  await context.userRepository.updateUserJoinDate({
    uid: input.uid,
    joinDate: input.joinDate,
  })
}


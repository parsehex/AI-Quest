import { STARTER_PREMISES } from '~/lib/constants'

export function useCreateGame() {
  const sock = useGameSocket()
  const fastMode = ref(true)

  const createRoom = async () => {
    try {
      await sock.createRoom(sock.premiseInput.value, fastMode.value)
      sock.premiseInput.value = ''
      sock.refreshRooms()
    } catch (error) {
      console.error('Failed to create room:', error)
    }
  }

  const refreshStarterPremise = () => {
    const picked = STARTER_PREMISES[Math.floor(Math.random() * STARTER_PREMISES.length)]
    if (picked === sock.premiseInput.value) {
      refreshStarterPremise()
    } else {
      sock.premiseInput.value = picked
    }
  }

  return {
    fastMode,
    createRoom,
    refreshStarterPremise,
    premiseInput: sock.premiseInput,
    remixPremise: sock.remixPremise
  }
}

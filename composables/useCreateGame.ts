import { STARTER_PREMISES } from '~/lib/constants'

export function useCreateGame() {
  const sock = useGameSocket()
  const fastMode = ref(true)
  const premiseInput = ref(STARTER_PREMISES[Math.floor(Math.random() * STARTER_PREMISES.length)])

  const createRoom = async () => {
    try {
      await sock.createRoom(premiseInput.value, fastMode.value)
      premiseInput.value = ''
      sock.refreshRooms()
    } catch (error) {
      console.error('Failed to create room:', error)
    }
  }

  const refreshStarterPremise = () => {
    const picked = STARTER_PREMISES[Math.floor(Math.random() * STARTER_PREMISES.length)]
    if (picked === premiseInput.value) {
      refreshStarterPremise()
    } else {
      premiseInput.value = picked
    }
  }

  return {
    fastMode,
    createRoom,
    refreshStarterPremise,
    premiseInput,
    remixPremise: sock.remixPremise
  }
}

<script setup lang="ts">
import { delay } from '~/lib/utils'
import type { PlayerCharacter } from '~/types/Game'
import CreateCharacter from '@/components/home/CreateCharacter.vue'
import GamesList from '@/components/home/GamesList.vue'
import { STARTER_PREMISES } from '~/lib/constants';

definePageMeta({
  title: "Home",
  name: "Home",
  path: "/",
  description: "Home page",
  keywords: "Home",
});

const sock = useGameSocket()

// Constants
const REFRESH_INTERVAL = 5000

// Reactive State
const gameState = reactive({
  fastMode: true,
  hasCharacter: false,
  playerCharacter: null as PlayerCharacter | null,
})

// Methods
const handleCharacterCreated = (character: PlayerCharacter) => {
  gameState.playerCharacter = { ...character }
  gameState.hasCharacter = true
  localStorage.setItem('playerCharacter', JSON.stringify(character))
}

const handleCreateRoom = async (e?: Event) => {
  if (e) e.preventDefault()

  try {
    sock.createRoom(
      sock.premiseInput.value,
      gameState.fastMode
    )

    sock.premiseInput.value = ''
    sock.refreshRooms()
  } catch (error) {
    console.error('Failed to create room:', error)
  }
}

const handleRefreshStarterPremise = async () => {
  sock.premiseInput.value = STARTER_PREMISES[Math.floor(Math.random() * STARTER_PREMISES.length)]
}

// Lifecycle
let refreshInterval: NodeJS.Timer | null = null

onMounted(() => {
  const character = getPlayerCharacter()
  if (character) {
    gameState.playerCharacter = character
    gameState.hasCharacter = true
  }
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>
<template>
  <div class="relative h-full flex flex-col items-center gap-4 mx-auto max-w-7xl">
    <div class="flex flex-col lg:flex-row max-w-6xl mx-auto px-4 py-6 gap-4">
      <GamesList />
      <!-- Character Creation -->
      <section class="bg-gray-800 rounded-lg p-6 order-first lg:order-none">
        <CreateCharacter @change="handleCharacterCreated" />
      </section>
      <!-- Create Game -->
      <section class="bg-gray-800 rounded-lg p-6 transition-all duration-300">
        <h2 class="text-2xl font-bold mb-6 flex items-center">
          <i class="i-heroicons-plus-circle mr-2" /> Create a Game
        </h2>
        <form @submit.prevent="handleCreateRoom" class="space-y-4">
          <div>
            <span class="block text-sm font-medium mb-2"> Game Premise
              <UButton type="button" icon="i-heroicons-arrow-path-16-solid" variant="ghost" size="xs"
                @click="handleRefreshStarterPremise" class="ml-2" />
              <UButton type="button" icon="i-heroicons-sparkles" variant="ghost" size="xs" @click="sock.remixPremise"
                class="ml-2" />
            </span>
            <UTextarea v-model="sock.premiseInput.value" placeholder="Describe your game scenario..." :rows="3"
              class="w-full" />
          </div>
          <div class="flex items-center gap-4">
            <UTooltip text="Fast Mode - Faster but lower quality">
              <div class="flex items-center gap-2">
                <label for="fastMode" class="text-sm font-medium"> Fast Mode <i
                    class="i-heroicons-clock inline-block w-4 h-4" />
                </label>
                <UToggle id="fastMode" v-model="gameState.fastMode" />
              </div>
            </UTooltip>
          </div>
          <UButton type="submit" icon="i-heroicons-plus" class="w-full"> Create Game </UButton>
        </form>
      </section>
    </div>
  </div>
</template>
<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<script setup lang="ts">
import { delay } from '~/lib/utils'
import type { Room } from '~/types/Game'
import ApprovalMessage from '@/components/home/ApprovalMessage.vue'
import GamesList from '@/components/home/GamesList.vue'
import { useProfile } from '~/composables/useProfile';

definePageMeta({
  title: "Home",
  name: "Home",
  path: "/",
  description: "Home page",
  keywords: "Home",
  pageTransition: false,
  layoutTransition: false
});

const user = useSupabaseUser()
const { profile } = useProfile()
const { refresh } = useRooms()
const { characters, activeCharacter, activeCharacterId, fetchCharacters } = useCharacters()

onMounted(() => {
  fetchCharacters()
})

// Constants
const REFRESH_INTERVAL = 5000
const STARTER_PREMISES = [
  'A bank robbery gone supernatural',
  'Dragon heist in a modern metropolis',
  'Magical bakery robbery during a blood moon',
  'Exploring a forgotten city beneath the waves',
  'Time-traveling train hijacking',
]

// Reactive State
const gameState = reactive({
  newRoomName: import.meta.env.DEV ? `Game ${Math.floor(Math.random() * 1000)}` : '',
  premise: import.meta.env.DEV ? STARTER_PREMISES[Math.floor(Math.random() * STARTER_PREMISES.length)] : '',
  fastMode: true,
})

// Methods
// Mutable characters for USelect
const mutableCharacters = computed(() => [...characters.value])

// Handle null <-> undefined conversion for USelect
const activeCharacterIdModel = computed({
  get: () => activeCharacterId.value || undefined,
  set: (val) => activeCharacterId.value = val || null
})

const handleCreateRoom = async (e?: Event) => {
  if (e) e.preventDefault()

  // Check if character is selected
  if (!activeCharacterId.value && !gameState.fastMode) {
    // Maybe prompt to select character?
    // For now, we allow creating without character if fast mode?
    // Or we just let them join as anonymous/spectator?
  }

  try {
    const room = await $fetch<Room>('/api/game/room', {
      method: 'POST',
      body: {
        name: gameState.newRoomName,
        premise: gameState.premise,
        fastMode: gameState.fastMode
      }
    })

    // Join the room
    navigateTo(`/room/${room.id}`)
  } catch (error) {
    console.error('Failed to create room:', error)
  }
}

// Lifecycle
let refreshInterval: NodeJS.Timer | null = null

onMounted(() => {
  // Legacy cleanup if needed
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>
<template>
  <div class="relative h-full flex flex-col items-center gap-4 mx-auto max-w-7xl">
    <div class="flex flex-wrap flex-col lg:flex-row max-w-6xl mx-auto px-4 py-6 gap-4">
      <GamesList />
      <ApprovalMessage v-if="user && profile && !profile.approved" />
      <!-- Character Selection -->
      <section v-if="user?.confirmed_at && profile?.approved"
        class="rounded-lg p-6 order-first lg:order-none border-gray-700 border">
        <h2 class="text-2xl font-bold mb-4 flex items-center">
          <i class="i-heroicons-user mr-2" /> Your Character
        </h2>
        <div v-if="characters.length > 0" class="space-y-4">
          <USelect v-model="activeCharacterIdModel" :options="mutableCharacters" option-attribute="nickname"
            value-attribute="id" label="Select Character" />
          <div v-if="activeCharacter" class="p-4 rounded-lg border-gray-700 border">
            <p class="font-bold text-lg">{{ activeCharacter.nickname }}</p>
            <p class="text-sm text-gray-400">{{ activeCharacter.race }} {{ activeCharacter.class }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ activeCharacter.background }}</p>
          </div>
          <div class="flex gap-2">
            <UButton to="/characters" variant="soft" block class="flex-1">Manage Characters</UButton>
            <UButton to="/characters" icon="i-heroicons-plus" color="gray" variant="ghost" />
          </div>
        </div>
        <div v-else class="text-center py-6">
          <p class="text-gray-400 mb-4">You don't have any characters yet.</p>
          <UButton to="/characters" icon="i-heroicons-plus" block>Create Character</UButton>
        </div>
      </section>
      <!-- Create Game -->
      <section v-if="user?.confirmed_at && profile?.approved"
        class="rounded-lg p-6 transition-all duration-300 border-gray-700 border">
        <h2 class="text-2xl font-bold mb-6 flex items-center">
          <i class="i-heroicons-plus-circle mr-2" /> Create a Game
        </h2>
        <form @submit.prevent="handleCreateRoom" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Room Name</label>
            <UInput v-model="gameState.newRoomName" placeholder="Enter a name for your game..." :ui="{
              width: 'w-full',
              input: 'text-sm'
            }" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Game Premise</label>
            <UTextarea v-model="gameState.premise" placeholder="Describe your game scenario..." :rows="3"
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
          <UButton type="submit" :disabled="!gameState.newRoomName.trim()" icon="i-heroicons-plus" class="w-full">
            Create Game </UButton>
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

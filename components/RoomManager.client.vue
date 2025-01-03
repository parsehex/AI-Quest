<script setup lang="ts">
import { delay } from '~/lib/utils'
import type { PlayerCharacter } from '~/types/Game'
import type CreateCharacter from './CreateCharacter.vue'

const ranNum = Math.floor(Math.random() * 1000)
const isDev = import.meta.env.DEV
const starters = [
  'A bank robbery',
  'dragon robbery',
  'bakery robbery',
  'exploring a forgotten city',
]
const newRoomName = ref(isDev ? `Game ${ranNum}` : '')
const fastMode = ref(true)
const premise = ref(isDev ? starters[Math.floor(Math.random() * starters.length)] : '')
const sock = useGameSocket()

// lookup object with arrays of player id and nickname
// so that you can use the room's id to get its players
const players = computed(() => {
  return sock.rooms.value.reduce((acc, room) => {
    acc[room.id] = room.players
    return acc
  }, {} as Record<string, { id: string; nickname: string }[]>)
})

const hasCharacter = ref(false);
const playerCharacter = ref(null as PlayerCharacter | null);

const handleCharacterCreated = (character: PlayerCharacter) => {
  console.log('Character created:', character);
  playerCharacter.value = { ...character };
  hasCharacter.value = true;
  localStorage.setItem('playerCharacter', JSON.stringify(character));
};

const handleCreateRoom = async (e: any) => {
  if (newRoomName.value.trim()) {
    sock.createRoom(newRoomName.value, premise.value, fastMode.value)
    newRoomName.value = ''
    premise.value = ''
    await delay(100)
    sock.refreshRooms()
  }
  e.preventDefault()
}

let refreshInterval: NodeJS.Timer | null = null

onMounted(() => {
  const character = getPlayerCharacter()
  if (character) {
    playerCharacter.value = character
    hasCharacter.value = true
  }
  sock.refreshRooms()
  refreshInterval = setInterval(() => {
    sock.refreshRooms()
  }, 5000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
})
</script>
<template>
  <div v-if="sock.isConnected.value">
    <CreateCharacter @change="handleCharacterCreated" />
    <Divider v-if="sock.rooms.value.length" />
    <!-- Room List -->
    <div v-if="sock.rooms.value.length" class="room-list mt-4">
      <h2 class="text-xl mb-4">Active Games</h2>
      <ul>
        <UTooltip class="list-item" v-for="room in sock.rooms.value" :key="room.id"
          :text="'Players: ' + players[room.id].map(p => p.nickname).join(', ')">
          <li class="my-2 flex justify-between"> {{ room.name }} ({{ room.players.length }} players) <UButton
              type="button" @click="$router.push(`/room/${room.id}`)" color="green" class="ml-4"> Join </UButton>
          </li>
        </UTooltip>
        <li v-if="!sock.rooms.value.length"> No rooms available </li>
      </ul>
    </div>
    <Divider />
    <div v-if="!sock.currentRoom.value" class="create-room">
      <h2 class="text-xl mb-4">Create a Game</h2>
      <UInput v-model="newRoomName" placeholder="Room name" @keyup.enter="handleCreateRoom" :ui="{
        width: 'w-48',
        input: 'text-sm'
      }" />
      <UTextarea v-model="premise" placeholder="Enter your game premise" class="mt-2" :rows="3" />
      <UTooltip class="mt-2 flex items-center space-x-2" text="Fast Mode - Faster but lower quality"> <label
          class="flex items-center gap-1" for="fastMode">Fast Mode <i class="i-heroicons-clock w-5 h-5"></i>
        </label>
        <UToggle id="fastMode" v-model="fastMode" />
      </UTooltip>
      <br />
      <UButton type="button" class="mt-2" @click="handleCreateRoom" @keyup.enter="handleCreateRoom"
        :disabled="!newRoomName.trim()"> Create Room </UButton>
    </div>
  </div>
</template>

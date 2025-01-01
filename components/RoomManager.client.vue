<script setup lang="ts">
import { delay } from '~/lib/utils'

const ranNum = Math.floor(Math.random() * 1000)
const isDev = import.meta.env.DEV
const starters = [
  'A bank robbery',
  'dragon robbery',
  'exploring a forgotten city',
]
const newRoomName = ref(isDev ? `Game ${ranNum}` : '')
const fastMode = ref(true)
const premise = ref(isDev ? starters[Math.floor(Math.random() * starters.length)] : '')
const sock = useGameSocket()
const { currentRoom, rooms, hasRooms } = sock

// lookup object with arrays of player id and nickname
// so that you can use the room's id to get its players
const players = computed(() => {
  return rooms.value.reduce((acc, room) => {
    acc[room.id] = room.players
    return acc
  }, {} as Record<string, { id: string; nickname: string }[]>)
})

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

onMounted(() => {
  sock.refreshRooms()
})
</script>
<template>
  <div v-if="sock.isConnected">
    <NicknameInput />
    <hr class="my-2 border-t border-gray-700" />
    <div v-if="!currentRoom" class="create-room">
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
    <!-- Room List -->
    <div v-if="!currentRoom" class="room-list mt-4">
      <ul>
        <UTooltip class="list-item" v-for="room in rooms" :key="room.id"
          :text="'Players: ' + players[room.id].map(p => p.nickname).join(', ')">
          <li class="my-2 flex justify-between"> {{ room.name }} ({{ room.players.length }} players) <UButton
              type="button" @click="$router.push(`/room/${room.id}`)" color="green" class="ml-4"> Join </UButton>
          </li>
        </UTooltip>
        <li v-if="!rooms.length"> No rooms available </li>
      </ul>
    </div>
    <!-- Current Room -->
    <div v-if="currentRoom" class="current-room">
      <p>In room: {{ currentRoom }}</p>
      <button @click="sock.leaveRoom"> Leave Room </button>
    </div>
  </div>
</template>

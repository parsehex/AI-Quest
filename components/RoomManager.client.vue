<script setup lang="ts">
const newRoomName = ref('')
const premise = ref('')
const sock = useGameSocket()
const { currentRoom, rooms, hasRooms } = sock

const handleCreateRoom = (e: any) => {
  if (newRoomName.value.trim()) {
    sock.createRoom(newRoomName.value, premise.value)
    newRoomName.value = ''
    premise.value = ''
  }
  e.preventDefault()
}

onMounted(() => {
  sock.refreshRooms()
})
</script>
<template>
  <div v-if="sock.isConnected">
    <div v-if="!currentRoom" class="create-room">
      <UInput v-model="newRoomName" placeholder="Room name" @keyup.enter="handleCreateRoom" :ui="{
        width: 'w-48',
        input: 'text-sm'
      }" />
      <UTextarea v-model="premise" placeholder="Enter your game premise" class="mt-2" :rows="3" />
      <UButton type="button" class="mt-2" @click="handleCreateRoom" @keyup.enter="handleCreateRoom"
        :disabled="!newRoomName.trim()"> Create Room </UButton>
    </div>
    <!-- Room List -->
    <div v-if="!currentRoom" class="room-list mt-4">
      <ul>
        <li v-for="room in rooms" :key="room.id"> {{ room.name }} ({{ room.players.length }} players) <UButton
            type="button" @click="$router.push(`/room/${room.id}`)" color="rose"> Join </UButton>
        </li>
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

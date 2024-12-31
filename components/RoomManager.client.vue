<script setup lang="ts">
const newRoomName = ref('')
const sock = useGameSocket()
const { currentRoom, rooms, hasRooms } = sock

const handleCreateRoom = (e: any) => {
  if (newRoomName.value.trim()) {
    sock.createRoom(newRoomName.value)
    newRoomName.value = ''
  }
	e.preventDefault()
}
</script>

<template>
  <div v-if="sock.isConnected">
		<h1>Rooms</h1>

    <div v-if="!currentRoom" class="create-room">
      <input
        v-model="newRoomName"
        placeholder="Room name"
        @keyup.enter="handleCreateRoom"
      >
      <button type="button" @click="handleCreateRoom" @keyup.enter="handleCreateRoom" :disabled="!newRoomName.trim()">
        Create Room
      </button>
    </div>

    <!-- Room List -->
    <div v-if="!currentRoom && hasRooms" class="room-list">
      <h3>Available Rooms:</h3>
      <ul>
        <li v-for="room in rooms" :key="room.id">
          {{ room.name }}
          ({{ room.players.length }} players)
          <button @click="sock.joinRoom(room.id)">
            Join
          </button>
        </li>
      </ul>
    </div>

    <!-- Current Room -->
    <div v-if="currentRoom" class="current-room">
      <p>In room: {{ currentRoom }}</p>
      <button @click="sock.leaveRoom">
        Leave Room
      </button>
    </div>
  </div>
</template>

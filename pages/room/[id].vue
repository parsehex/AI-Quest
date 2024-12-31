<script setup lang="ts">
import { delay } from '~/lib/utils'
import ChatRoom from '~/components/game-room/ChatRoom.vue'
import Game from '~/components/game-room/Game.vue'

const log = useLog('room-id')
const route = useRoute()
const roomId = route.params.id as string
const sock = useGameSocket()
const { messages } = sock
const router = useRouter()

// Join room on page load
onMounted(async () => {
  await sock.waitConnected()
  await delay(500)
  const roomIds = sock.rooms.value.map((room) => room.id)
  log.debug('mounted - roomIds', roomIds, 'this:', roomId)

  if (!roomIds.includes(roomId)) {
    // @ts-ignore
    window.location.href = '/'
    return
  }

  sock.reinitializeListeners()
  sock.joinRoom(roomId)
  sock.refreshMessages(roomId)
})

// Leave room when navigating away
onBeforeUnmount(() => {
  sock.leaveRoom()
})

onBeforeRouteLeave((to, from) => {
  if (from.name === 'room-id') {
    sock.leaveRoom()
  }
})
</script>
<template>
  <h2 class="text-xl font-semibold text-center">{{ sock.thisRoom.value?.name }}</h2>
  <div class="container-fluid mx-auto py-8 flex gap-2">
    <Game :roomId="roomId" />
    <ChatRoom :messages="messages" :room-id="roomId" />
  </div>
</template>

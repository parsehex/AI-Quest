<script setup lang="ts">
import { delay } from '~/lib/utils'
import Game from '~/components/game-room/Game.vue'
import Players from '~/components/sidebar/Players.vue'
import RoomDetails from '~/components/sidebar/RoomDetails.vue'
import ChatRoom from '~/components/sidebar/ChatRoom.vue'

const tabs = [{
  label: 'Chat',
  icon: 'i-heroicons-information-chat-bubble-left-solid',
  content: 'chat'
}, {
  label: 'Room details',
  icon: 'i-heroicons-newspaper',
  content: 'room-details'
}, {
  label: 'Players',
  icon: 'i-heroicons-users',
  content: 'players'
}]

const log = useLog('room-id')
// const device = useDevice()
const route = useRoute()
const roomId = route.params.id as string
const sock = useGameSocket()
const { messages } = sock
const isChatOpen = ref(false)
// const isChatOpen = useLocalStorage('game-chat-open', device.isDesktopOrTablet)

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
  <div>
    <h2 class="text-xl font-semibold text-center">{{ sock.thisRoom.value?.name }}</h2>
    <div class="px-6 mx-auto py-8 flex gap-2 relative">
      <Game :roomId="roomId" :is-full-width="!isChatOpen" />
      <!-- <div class="fixed top-1/3 right-0 flex flex-col items-center">
        <span class="text-xs text-muted mb-1 select-none"></span>
        <button @click="isChatOpen = !isChatOpen"
          class="bg-white dark:bg-neutral-800 p-2 rounded-l-lg border dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-700">
          <i :class="isChatOpen ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-left'" class="w-5 h-5"></i>
        </button>
      </div> -->
      <UTabs :items="tabs"
        :class="`flex flex-col h-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow fixed transition-all duration-300 top-0 bottom-0 ${isChatOpen ? 'w-1/3' : 'hidden'}`">
        <template #item="{ item, selected }">
          <ChatRoom v-if="selected && item.content === 'chat'" :messages="messages" :room-id="roomId"
            v-model:is-open="isChatOpen" />
          <RoomDetails v-else-if="selected && item.content === 'room-details'" />
          <Players v-else-if="selected && item.content === 'players'" />
        </template>
      </UTabs>
    </div>
  </div>
</template>

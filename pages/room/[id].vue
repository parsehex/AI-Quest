<script setup lang="ts">
import { delay } from '~/lib/utils'
import Game from '~/components/game-room/Game.vue'
import Players from '~/components/sidebar/Players.vue'
import RoomDetails from '~/components/sidebar/RoomDetails.vue'
import ChatRoom from '~/components/sidebar/ChatRoom.vue'

const tabs = [{
  label: 'Chat',
  icon: 'i-heroicons-chat-bubble-left',
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
const device = useDevice()
const route = useRoute()
const roomId = route.params.id as string
const spectate = route.query.spectate === '1'
const { rooms } = useRooms()
const roomIds = computed(() => rooms.value.map((r: any) => r.id))
const { messages } = useRoomMessages()
const sock = useGameSocket()
const isChatOpen = useLocalStorage('game-chat-open', device.isDesktopOrTablet)

// Join room on page load
onMounted(async () => {
  await sock.waitConnected()
  await delay(500)
  log.debug('mounted - rooms', rooms, 'this:', roomId)

  // TODO not working
  // if (!roomIds.value.includes(roomId)) {
  //   // @ts-ignore
  //   window.location.href = '/'
  //   return
  // }

  sock.reinitializeListeners()

  // Use active character from DB if available
  const { activeCharacter } = useCharacters()

  sock.joinRoom(roomId, spectate, activeCharacter.value?.id)
})

// Leave room when navigating away
onBeforeRouteLeave((to, from) => {
  sock.leaveRoom()
})
</script>
<template>
  <div>
    <h2 class="text-xl font-semibold text-center">{{ sock.thisRoom.value?.name }}</h2>
    <div class="container-fluid mx-auto py-8 flex gap-2 relative">
      <Game :roomId="roomId" :is-full-width="!isChatOpen" />
      <div v-if="!isChatOpen" class="fixed top-1/3 right-0 flex flex-col items-center">
        <UButton @click="isChatOpen = !isChatOpen" class="p-2 rounded-l-lg border dark:border-neutral-700" color="gray"
          :icon="isChatOpen ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-left'">
        </UButton>
      </div>
      <UTabs :items="tabs"
        :class="`flex flex-col h-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow fixed transition-all duration-300 top-0 right-0 bottom-0 ${isChatOpen ? 'w-1/3' : 'hidden'}`">
        <template #default="{ item, index, selected }">
          <span class="truncate" :class="[selected && 'text-primary-500 dark:text-primary-400']">{{ item.label }}</span>
        </template>
        <template #item="{ item, selected }">
          <UButton @click="isChatOpen = !isChatOpen" class="ml-4 mb-2 p-2 rounded-l-lg border dark:border-neutral-700"
            color="red" variant="outline"> Close sidebar </UButton>
          <ChatRoom v-if="selected && item.content === 'chat'" :room-id="roomId" v-model:is-open="isChatOpen" />
          <RoomDetails v-else-if="selected && item.content === 'room-details'" />
          <Players v-else-if="selected && item.content === 'players'" />
        </template>
      </UTabs>
    </div>
  </div>
</template>

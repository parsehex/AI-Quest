<script setup lang="ts">
import type { Message } from '~/types/Game';

const log = useLog('ChatRoom')

const props = defineProps<{
  messages: Message[]
  roomId: string
}>()

const message = ref('')
const chatContainer = ref<HTMLElement | null>(null)
const sock = useGameSocket()
const room = computed(() => sock.thisRoom.value)
const players = computed(() => room.value?.players || [])

const sendMessage = () => {
  if (message.value.trim()) {
    log.debug('Sending message:', message.value)
    sock.sendMessage(props.roomId, message.value)
    message.value = ''
  }
}

// Auto-scroll to bottom when new messages arrive
watch(() => props.messages, () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}, { deep: true })
</script>
<template>
  <div
    class="flex flex-col h-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow w-1/3 fixed right-4 top-4">
    <!-- Chat Header -->
    <div class="p-4 border-b dark:border-neutral-700">
      <h2 class="text-lg text-muted font-semibold">Chat Room</h2>
      <p class="text-sm text-muted">{{ messages.length }} messages</p>
    </div>
    <!-- Players List -->
    <div class="p-4 border-b dark:border-neutral-700 flex gap-4 overflow-x-auto">
      <h3 class="text-md text-muted font-semibold">Players</h3>
      <ul class="flex gap-4">
        <li v-for="(player, index) in players" :key="index" class="flex items-center gap-2">
          <UAvatar :src="`https://api.dicebear.com/7.x/identicon/svg?seed=${player.id}`" :alt="player.nickname"
            size="sm" />
          <span class="text-sm">{{ player.nickname }}</span>
        </li>
      </ul>
    </div>
    <!-- Messages Area -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
      <div v-for="(msg, i) in messages" :key="i" class="flex gap-2">
        <div class="flex-shrink-0">
          <UAvatar :src="`https://api.dicebear.com/7.x/identicon/svg?seed=${msg.sender}`" :alt="msg.nickname"
            size="sm" />
        </div>
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm">{{ msg.nickname }}</span>
            <span class="text-xs text-muted" v-if="msg.timestamp"> {{ new Date(msg.timestamp).toLocaleTimeString() }}
            </span>
          </div>
          <p class="text-sm">{{ msg.text }}</p>
        </div>
      </div>
    </div>
    <!-- Message Input -->
    <div class="p-4 border-t dark:border-neutral-700">
      <form @submit.prevent="sendMessage" class="flex gap-2">
        <UInput v-model="message" placeholder="Type a message..." :ui="{
          width: 'w-full',
          padding: 'p-2',
          focus: 'focus:ring-2 focus:ring-primary-500'
        }" />
        <UButton type="submit" color="primary" :disabled="!message.trim()" icon="i-heroicons-paper-airplane"> Send
        </UButton>
      </form>
    </div>
  </div>
</template>

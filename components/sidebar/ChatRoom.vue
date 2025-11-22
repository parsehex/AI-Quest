<script setup lang="ts">
const log = useLog('ChatRoom')

const props = defineProps<{
  roomId: string
  isOpen: boolean
}>()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
}>()

const message = ref('')
const chatContainer = ref<HTMLElement | null>(null)
const { room } = useThisRoom()
const { messages, sendMessage, loading } = useRoomMessages()

const handleSendMessage = () => {
  if (message.value.trim()) {
    log.debug('Sending message:', message.value)
    sendMessage(message.value)
    message.value = ''
  }
}

// Auto-scroll to bottom when new messages arrive
watch(() => messages.value, () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}, { deep: true })
</script>
<template>
  <div>
    <!-- Chat Header -->
    <div class="p-4 border-b dark:border-neutral-700 flex items-center gap-4">
      <p class="text-sm text-muted">{{ messages.length }} messages</p>
    </div>
    <!-- Messages Area -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
      <div v-if="loading" class="text-center py-8">
        <Spinner />
        <p class="text-muted mt-2">Loading messages...</p>
      </div>
      <div v-else-if="messages.length === 0" class="text-center py-8 text-muted">
        <p>No messages yet. Start the conversation!</p>
      </div>
      <div v-else v-for="(msg, i) in messages" :key="i" class="flex gap-2">
        <div class="flex-shrink-0">
          <UAvatar
            :src="(msg as any).sender?.discord_avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${msg.sender_id}`"
            :alt="(msg as any).sender?.discord_username || msg.sender_id || 'User'" size="sm" />
        </div>
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm">{{ (msg as any).sender?.discord_username || (msg as
              any).character_nickname || 'User' }}</span>
            <span class="text-xs text-muted" v-if="msg.created_at">{{ new Date(msg.created_at).toLocaleTimeString() }}
            </span>
          </div>
          <p class="text-sm">{{ msg.text }}</p>
        </div>
      </div>
    </div>
    <!-- Message Input -->
    <div class="p-4 border-t dark:border-neutral-700">
      <form @submit.prevent="handleSendMessage" class="flex gap-2">
        <UInput v-model="message" placeholder="Type a message..." :ui="{
          width: 'w-full',
          wrapper: 'grow',
          padding: 'p-2',
          focus: 'focus:ring-2 focus:ring-primary-500'
        }" />
        <UButton type="submit" color="primary" :disabled="!message.trim()" icon="i-heroicons-paper-airplane">
        </UButton>
      </form>
    </div>
  </div>
</template>

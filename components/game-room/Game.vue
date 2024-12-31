<script setup lang="ts">
const log = useLog('ChatRoom')

const props = defineProps<{
  roomId: string
}>()

const sock = useGameSocket()
</script>

<template>
  <div class="flex flex-col h-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow w-2/3">
    <!-- Chat Header -->
    <div class="p-4 border-b dark:border-neutral-700">
      <h2 class="text-xl text-muted font-semibold">Game</h2>
    </div>

    <!-- Messages Area -->
    <div
      ref="chatContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
    >
    <!--  -->
    </div>

    <!-- Message Input -->
    <div class="p-4 border-t dark:border-neutral-700">
      <!--  -->
    </div>
  </div>
</template>

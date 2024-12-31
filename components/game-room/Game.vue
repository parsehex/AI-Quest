<script setup lang="ts">
const log = useLog('ChatRoom')

const props = defineProps<{
  roomId: string
}>()

const sock = useGameSocket()
const aiResponse = ref('')
const isAiLoading = computed(() => sock.thisRoom.value?.aiLoading || false)

watch(() => sock.thisRoom.value?.aiLoading, (newVal) => {
  if (!newVal) {
    // AI finished processing
    aiResponse.value = sock.thisRoom.value?.lastAiResponse || ''
  }
})
</script>
<template>
  <div class="flex flex-col h-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow w-2/3">
    <div class="p-4 border-b dark:border-neutral-700">
      <h2 class="text-xl text-muted font-semibold"> Game <!-- button to regenerate response with icon -->
        <UButton @click="sock.regenerateResponse" color="violet" class="float-right">
          <UIcon name="refresh" />
        </UButton>
      </h2>
    </div>
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <div v-if="isAiLoading" class="text-center flex flex-col items-center space-y-2">
        <Spinner />
        <span class="text-muted">Loading...</span>
      </div>
      <!-- <div v-else class="prose dark:prose-invert max-w-none whitespace-pre-line"> {{ aiResponse }} </div> -->
      <!-- <MDC :value="md" tag="article" /> -->
      <MDC v-else :value="aiResponse" tag="article" />
    </div>
  </div>
</template>

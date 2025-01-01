<script setup lang="ts">
import { socket } from '~/lib/socket';

const props = defineProps<{
  roomId: string
}>();

const sock = useGameSocket();
const isAiLoading = computed(() => sock.thisRoom.value?.aiLoading || false);
const isMyTurn = computed(() => sock.thisRoom.value?.currentPlayer === socket?.id);
const choice = ref('');

const room = computed(() => sock.thisRoom.value);

const makeChoice = (choice: string) => {
  if (!isMyTurn.value) return;
  sock.makeChoice(props.roomId, choice);
};
</script>
<template>
  <div class="flex flex-col h-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow w-2/3">
    <div class="p-4 border-b dark:border-neutral-700">
      <h2 class="text-xl text-muted font-semibold"> Game <UButton @click="sock.regenerateResponse(props.roomId)"
          color="violet" class="float-right"> Try again </UButton>
      </h2>
    </div>
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- room.history -->
      <div v-if="room" class="prose dark:prose-invert max-w-none">
        <MDC v-for="(msg, i) in room?.history" :key="i" :value="msg" />
      </div>
      <div v-if="isAiLoading" class="text-center flex flex-col items-center space-y-2">
        <Spinner />
        <span class="text-muted">Loading...</span>
      </div>
      <template v-else-if="sock.thisRoom.value?.lastAiResponse">
        <div class="prose dark:prose-invert max-w-none">
          <h3>{{ sock.thisRoom.value.lastAiResponse.intro }}</h3>
          <p>{{ sock.thisRoom.value.lastAiResponse.narrative }}</p>
          <div v-if="isMyTurn" class="mt-4">
            <h4>Your turn - Choose your action:</h4>
            <div class="space-y-2">
              <UButton v-for="(choice, i) in sock.thisRoom.value.lastAiResponse.choices" :key="i" block
                @click="makeChoice(choice)"> {{ choice }} </UButton>
              <UInput v-model="choice" placeholder="Enter your own choice"
                @keyup.enter="makeChoice(choice); choice = ''" />
            </div>
          </div>
          <div v-else class="mt-4 text-muted"> Waiting for {{ sock.thisRoom.value.players.find(p => p.id ===
            sock.thisRoom.value?.currentPlayer)?.nickname }} to make a choice... </div>
        </div>
      </template>
    </div>
  </div>
</template>

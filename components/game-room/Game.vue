<script setup lang="ts">
import { socket } from '~/lib/socket';

const props = defineProps<{
  roomId: string,
  isFullWidth: boolean,
}>();

const sock = useGameSocket();
const isAiLoading = computed(() => sock.thisRoom.value?.aiLoading || undefined);
const isSpectator = computed(() => sock.thisRoom.value?.players.find(p => p.id === socket?.id)?.isSpectator);
const isMyTurn = computed(() => !isSpectator.value && sock.thisRoom.value?.currentPlayer === socket?.id);
const canRegenerate = computed(() => isMyTurn.value && sock.thisRoom.value?.aiLoading);
const choice = ref('');

const room = computed(() => sock.thisRoom.value);

const currentPlayerName = computed(() => {
  return room.value?.players.find(p => p.id === room.value?.currentPlayer)?.nickname;
});

const makeChoice = (choice: string) => {
  if (!isMyTurn.value) return;
  sock.makeChoice(props.roomId, choice);
};

onBeforeUnmount(() => {
  sock.leaveRoom();
  sock.refreshRooms();
});

const audioRef = ref<HTMLAudioElement>();
const currentTTS = ref<string>();

watch(() => sock.thisRoom.value?.lastAiResponse?.tts, (newTTS) => {
  if (newTTS) {
    currentTTS.value = newTTS;
    // Auto-play new TTS after a short delay
    nextTick(() => {
      if (audioRef.value) {
        audioRef.value.playbackRate = 1.1;
        audioRef.value.play();
      }
    });
  }
});
</script>
<template>
  <div class="flex flex-col h-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow w-2/3"
    :class="isFullWidth ? 'w-full' : ''">
    <div class="p-4 border-b dark:border-neutral-700">
      <h2 class="text-xl text-muted font-semibold"> Game <span v-if="isSpectator" class="text-sm text-muted">(Spectator
          Mode)</span>
        <UTooltip v-if="canRegenerate" class="float-right" text="Regenerate the last turn">
          <UButton @click="sock.regenerateResponse(props.roomId)" color="violet">
            <i class="i-heroicons-arrow-path-16-solid w-5 h-5"></i> Retry
          </UButton>
        </UTooltip>
        <UButton v-else class="float-right" @click="sock.requestTurn(props.roomId)" color="violet"> Request Turn
        </UButton>
      </h2>
    </div>
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <div v-if="room?.history" class="prose dark:prose-invert max-w-none">
        <div v-for="(msg, i) in room?.history" :key="i">
          <span v-if="msg.type === 'intro' || msg.type === 'narrative'">{{ msg.text }}</span>
          <span v-else-if="msg.type === 'choice'">
            <span class="text-muted">{{ msg.player }} chose: </span>
            <span class="font-bold">{{ msg.text }}</span>
          </span>
        </div>
      </div>
      <div v-if="isAiLoading" class="text-center flex flex-col items-center space-y-2">
        <Spinner :progress="isAiLoading.progress" />
        <span class="text-muted">{{ isAiLoading.message }}</span>
      </div>
      <template v-else-if="sock.thisRoom.value?.lastAiResponse">
        <div class="prose dark:prose-invert max-w-none">
          <audio v-if="sock.thisRoom.value.lastAiResponse.tts" ref="audioRef"
            :src="sock.thisRoom.value.lastAiResponse.tts" controls class="w-full mt-2 mb-4" />
          <h3>{{ sock.thisRoom.value.lastAiResponse.intro }}</h3>
          <p>{{ sock.thisRoom.value.lastAiResponse.narrative }}</p>
          <div class="mt-4">
            <h4>
              <template v-if="isMyTurn">Your turn - Make your choice:</template>
              <template v-else>Waiting for {{ currentPlayerName }} to choose:</template>
            </h4>
            <div class="space-y-2">
              <UButton v-for="(choice, i) in sock.thisRoom.value.lastAiResponse.choices" :key="i" block
                :disabled="!isMyTurn" :color="isMyTurn ? 'primary' : 'gray'" @click="makeChoice(choice)"> {{ choice }}
              </UButton>
              <UInput v-if="isMyTurn" v-model="choice" placeholder="Enter your own choice"
                @keyup.enter="makeChoice(choice); choice = ''" />
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

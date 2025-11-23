<script setup lang="ts">
import GameHistory from './GameHistory.vue';

const props = defineProps<{
  roomId: string,
  isFullWidth: boolean,
}>();

const sock = useGameSocket();
const { room, loading: roomLoading, refresh } = useThisRoom();
const { me, players, loading: playersLoading, refresh: refreshPlayers } = useRoomPlayers();
const aiLoading = computed(() => sock.aiLoading.value || undefined);
const isSpectator = computed(() => me.value?.is_spectator);
const isMyTurn = computed(() => {
  // Don't compute turn state until data is loaded
  if (roomLoading.value || playersLoading.value) return false;
  return !isSpectator.value && room.value?.current_player === me.value?.user.id;
});
const canRegenerate = computed(() => (isMyTurn.value || !players.value.length) && !aiLoading.value);
const choice = ref('');

// Debug logging
watch([() => me.value, () => room.value?.current_player, isMyTurn], ([meVal, currentPlayer, myTurn]) => {
}, { immediate: true });

// Clear loading state when room updates with new AI response
watch(() => room.value, (newRoom, oldRoom) => {
  if (newRoom && sock.aiLoading.value && newRoom.last_ai_response && !oldRoom?.last_ai_response) {
    sock.aiLoading.value = undefined;
  }
});

const currentPlayerName = computed(() => {
  return players.value.find(p => p.user.id === room.value?.current_player)?.character?.nickname;
});

const previousChoice = computed(() => {
  const r = room.value as any;
  if (!r?.game_history) return null;

  // Find the last choice in history
  const history = [...r.game_history].sort((a: any, b: any) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const lastChoice = history.reverse().find((h: any) => h.type === 'choice');

  if (!lastChoice) return null;

  // Resolve player name
  let playerName = 'Unknown';
  if (lastChoice.player_id) {
    const player = players.value.find(p => p.user.id === lastChoice.player_id);
    playerName = player?.character?.nickname || player?.user?.discord_username || 'Unknown';
  }

  return {
    ...lastChoice,
    playerName
  };
});

const makeChoice = async (choice: string) => {
  if (!isMyTurn.value) return;
  await sock.makeChoice(props.roomId, choice);
  await refresh();
};

const handleRegenerate = async () => {
  await sock.regenerateResponse(props.roomId);
  await refresh();
};

const handleRequestTurn = async () => {
  await sock.requestTurn(props.roomId);
  await refresh();
};

const { activeCharacter } = useCharacters();

const handleJoin = async () => {
  await sock.joinRoom(props.roomId, false, activeCharacter.value?.id);
  await refreshPlayers();
};

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
  <div class="flex flex-col w-2/3" :class="isFullWidth ? 'w-full' : ''">
    <div
      class="flex flex-col h-full rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow mb-4">
      <div class="p-4 border-b dark:border-neutral-700">
        <h2 class="text-xl text-muted font-semibold"> Turn #{{ room?.current_turn }} <span v-if="isSpectator"
            class="text-sm text-muted">(Spectator Mode)</span>
          <UTooltip v-if="canRegenerate" class="float-right" text="Regenerate the last turn">
            <UButton @click="handleRegenerate" color="violet" icon="i-heroicons-arrow-path-16-solid"> Retry </UButton>
          </UTooltip>
          <UButton v-else class="float-right" @click="handleRequestTurn" color="violet"> Request Turn </UButton>
        </h2>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-if="roomLoading || playersLoading" class="text-center py-8">
          <Spinner />
          <p class="text-muted mt-2">Loading game state...</p>
        </div>
        <div v-else-if="!me && !isSpectator" class="text-center py-8 flex flex-col items-center justify-center h-full">
          <p class="text-muted mb-4">You are viewing this room but have not yet joined.</p>
          <UButton @click="handleJoin" size="lg" color="primary" icon="i-heroicons-user-plus">Join Game</UButton>
        </div>
        <div v-else-if="aiLoading" class="text-center flex flex-col items-center space-y-2">
          <Spinner :progress="aiLoading.progress" />
          <span class="text-muted">{{ aiLoading.message }}</span>
        </div>
        <template v-else-if="room?.last_ai_response">
          <div class="prose dark:prose-invert max-w-none">
            <audio v-if="room.last_ai_response.tts" ref="audioRef" :src="room.last_ai_response.tts" controls
              class="w-full mt-2 mb-4" />
            <div v-if="previousChoice"
              class="mb-6 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700">
              <div class="text-xs font-bold text-muted uppercase tracking-wider mb-1">Previous Turn</div>
              <div class="text-sm">
                <span class="text-muted">{{ previousChoice.playerName }} chose: </span>
                <span class="font-semibold">{{ previousChoice.text }}</span>
              </div>
            </div>
            <h3>{{ room.last_ai_response.intro }}</h3>
            <p>{{ room.last_ai_response.narrative }}</p>
            <div class="mt-4">
              <h4>
                <template v-if="isMyTurn">Your turn - Make your choice:</template>
                <template v-else>Waiting for {{ currentPlayerName }} to choose:</template>
              </h4>
              <div class="space-y-2">
                <UButton v-for="(choice, i) in room.last_ai_response.choices" :key="i" block :disabled="!isMyTurn"
                  :color="isMyTurn ? 'primary' : 'gray'" @click="makeChoice(choice)"> {{ choice }} </UButton>
                <UInput v-if="isMyTurn" v-model="choice" placeholder="Enter your own choice"
                  @keyup.enter="makeChoice(choice); choice = ''" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
    <GameHistory :history="(room as any)?.game_history || []" :players="players as any" :loading="roomLoading" />
  </div>
</template>

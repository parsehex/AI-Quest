<script setup lang="ts">
const log = useLog('components/sidebar/RoomDetails')
const route = useRoute()
const roomId = route.params.id as string
const sock = useGameSocket()
const { room } = useThisRoom()
const { players, me } = useRoomPlayers()
const currentTurnPlayer = computed(() => players.value.find(p => p.user.id === room.value?.current_player))
const premise = computed(() => room.value?.premise)
</script>
<template>
	<div class="p-4 border dark:border-neutral-700">
		<p>Room ID: {{ roomId }}</p>
		<p>Players: {{ players.length }}</p>
		<p>Current player: {{ currentTurnPlayer }}</p>
		<p>Premise: {{ premise }}</p>
		<p>My ID: {{ sock.clientId.value }}</p>
		<p>Me: {{ me }}</p>
		<p>Spectating: {{ me?.is_spectator }}</p>
	</div>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
const { profile } = useProfile()
const { rooms, loading: isLoading, refresh } = useRooms()
const { activeCharacterId, activeCharacter } = useCharacters()

// Computed
const activeGames = computed(() => {
	return rooms.value.map((room: any) => ({
		...room,
		playerCount: room.room_players.length
	}))
})

onMounted(() => {
	refresh();
});

const navigateToRoom = (roomId: string, isSpectator = false) => {
	if (isSpectator) {
		useRouter().push(`/room/${roomId}?spectate=1`);
	} else {
		useRouter().push(`/room/${roomId}`);
	}
};
</script>
<template>
	<section class="bg-gray-800 rounded-lg p-6 transition-all duration-300 max-w-2xl mx-auto">
		<header class="flex items-center justify-between mb-4 gap-4">
			<h2 class="text-2xl font-bold flex items-center">
				<i class="i-heroicons-play-circle mr-2" /> Active Games
			</h2>
			<UBadge v-if="activeGames.length" :color="activeGames.length ? 'green' : 'gray'" size="xs"> {{ activeGames.length
			}} Active </UBadge>
		</header>
		<div v-if="isLoading && !activeGames.length" class="flex justify-center py-8">
			<Spinner />
		</div>
		<div v-else-if="!activeGames.length" class="text-center py-8 text-gray-400">
			<i class="i-heroicons-face-frown text-4xl mb-2" />
			<p>No active games found</p>
		</div>
		<ul v-else class="space-y-4">
			<li v-for="game in activeGames" :key="game.id"
				class="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors border border-gray-600">
				<div class="space-y-1 w-full mb-2">
					<h3 class="text-xl font-semibold truncate">{{ game.name }}</h3>
				</div>
				<div class="flex items-center gap-2 flex-shrink-0">
					<UBadge class="select-none" color="blue" size="sm"> {{ game.playerCount }} player{{ game.playerCount !== 1 ?
						's' : '' }} </UBadge>
					<UButton icon="i-heroicons-eye" color="sky" variant="soft" size="sm" @click="navigateToRoom(game.id, true)">
						Spectate </UButton>
					<UTooltip :text="!activeCharacterId ? 'Select a character to join' : 'Join Game'">
						<UButton v-if="user?.confirmed_at && profile?.approved" icon="i-heroicons-play" color="green" size="sm"
							:disabled="!activeCharacterId" @click="navigateToRoom(game.id)"> {{ activeCharacter ? `Join as
							${activeCharacter.nickname}` : 'Join' }} </UButton>
					</UTooltip>
				</div>
			</li>
		</ul>
	</section>
</template>

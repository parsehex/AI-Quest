<script setup lang="ts">
import type { Room } from '~/types/Game'

interface CustomRoom extends Room {
	playerCount: number
}

const sock = useGameSocket()

// Computed
const games = computed(() => {
	return sock.rooms.value.map((room: Room) => ({
		...room,
		playerCount: room.players.length
	})) as CustomRoom[]
})
const activeGames = computed(() => {
	return games.value.filter((game) => game.playerCount > 0)
})

let refreshInterval: NodeJS.Timer | null = null

onMounted(() => {
	sock.refreshRooms()
	refreshInterval = setInterval(() => {
		sock.refreshRooms()
	}, 5000)
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
				<i class="i-heroicons-play-circle mr-2" /> Game Rooms
			</h2>
			<UBadge v-if="games.length" :color="activeGames.length ? 'green' : 'gray'" size="xs"> {{ activeGames.length }}
				Active </UBadge>
		</header>
		<div v-if="!games.length" class="text-center py-8 text-gray-400">
			<i class="i-heroicons-face-frown text-4xl mb-2" />
			<p>No games found</p>
		</div>
		<ul v-else class="space-y-4">
			<li v-for="game in games" :key="game.id"
				class="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors border border-gray-600">
				<Collapsible :title="game.name" :subtitle="game.playerCount ? game.playerCount + ' players' : undefined"
					transparent class="mb-2">
					<p>{{ game.premise }}</p>
				</Collapsible>
				<div class="flex items-center gap-2 flex-shrink-0">
					<!-- TODO spectate -->
					<!-- <UButton icon="i-heroicons-eye" color="sky" variant="soft" size="sm" @click="navigateToRoom(game.id, true)">
						Spectate </UButton> -->
					<UButton icon="i-heroicons-play" color="green" size="sm" @click="navigateToRoom(game.id)"> Join </UButton>
				</div>
			</li>
		</ul>
	</section>
</template>

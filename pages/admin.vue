<script setup lang="ts">
definePageMeta({
	title: "Admin",
	name: "Admin",
	description: "Admin panel",
});

const log = useLog('pages/admin');
const sock = useGameSocket();
const { rooms, isConnected } = sock;

// # of players across all rooms
const totalPlayers = computed(() => {
	return rooms.value.reduce((acc, room) => acc + room.players.length, 0);
});

// unique players (by ID) across all rooms
const uniquePlayers = computed(() => {
	const players = new Set();
	rooms.value.forEach(room => {
		room.players.forEach(player => {
			players.add(player.id);
		});
	});
	return players.size;
});

onMounted(() => {
	sock.refreshRooms();
});
</script>
<template>
	<div class="container mx-auto p-4">
		<h1 class="text-2xl font-bold mb-6">Admin Panel</h1>
		<!-- Connection Status -->
		<div class="mb-6 p-4 bg-white dark:bg-neutral-800 rounded-lg shadow">
			<h2 class="text-xl font-semibold mb-2">Connection Status</h2>
			<div class="flex items-center gap-2">
				<div class="w-3 h-3 rounded-full" :class="isConnected ? 'bg-green-500' : 'bg-red-500'"></div>
				<span>{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
			</div>
		</div>
		<!-- Stats Overview -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
			<div class="p-4 bg-white dark:bg-neutral-800 rounded-lg shadow">
				<h3 class="text-lg font-medium mb-2">Active Rooms</h3>
				<p class="text-2xl font-bold">{{ rooms.length }}</p>
			</div>
			<div class="p-4 bg-white dark:bg-neutral-800 rounded-lg shadow">
				<h3 class="text-lg font-medium mb-2">Total Players</h3>
				<p class="text-2xl font-bold">{{ totalPlayers }}</p>
			</div>
			<div class="p-4 bg-white dark:bg-neutral-800 rounded-lg shadow">
				<h3 class="text-lg font-medium mb-2">Unique Players</h3>
				<p class="text-2xl font-bold">{{ uniquePlayers }}</p>
			</div>
		</div>
		<!-- Rooms List -->
		<div class="bg-white dark:bg-neutral-800 rounded-lg shadow p-4">
			<h2 class="text-xl font-semibold mb-4">Active Rooms</h2>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b dark:border-neutral-700">
							<th class="text-left p-2">Room ID</th>
							<th class="text-left p-2">Name</th>
							<th class="text-left p-2">Players</th>
							<th class="text-left p-2">Fast Mode</th>
							<th class="text-left p-2">Current Turn</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="room in rooms" :key="room.id" class="border-b dark:border-neutral-700">
							<td class="p-2">{{ room.id }}</td>
							<td class="p-2">{{ room.name }}</td>
							<td class="p-2">
								<div v-for="player in room.players" :key="player.id" class="flex items-center gap-2">
									<UAvatar :src="`https://api.dicebear.com/7.x/identicon/svg?seed=${player.id}`" :alt="player.nickname"
										size="xs" /> {{ player.nickname }}
								</div>
							</td>
							<td class="p-2">{{ room.fastMode ? 'Yes' : 'No' }}</td>
							<td class="p-2">{{ room.currentPlayer }}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import RoomLogsModal from '~/components/admin/RoomLogsModal.vue';

definePageMeta({
	title: "Admin",
	name: "Admin",
	description: "Admin panel",
});

const log = useLog('pages/admin');
const sock = useGameSocket();
const admin = useAdminSocket();

// # of players across all rooms
const totalPlayers = computed(() => {
	return sock.rooms.value.reduce((acc, room) => acc + room.players.length, 0);
});

// unique players (by ID) across all rooms
const uniquePlayers = computed(() => {
	const players = new Set();
	sock.rooms.value.forEach(room => {
		room.players.forEach(player => {
			players.add(player.id);
		});
	});
	return players.size;
});

onMounted(() => {
	sock.refreshRooms();

	const savedPassword = localStorage.getItem('adminPassword');
	if (savedPassword) {
		admin.checkPassword(savedPassword);
	}
});

const { isValidated } = admin;

const password = ref('');

const handlePasswordSubmit = () => {
	localStorage.setItem('adminPassword', password.value);
	admin.checkPassword(password.value);
};

const handleClearRooms = () => {
	admin.clearRooms();
	sock.refreshRooms();
};

const handleRemoveAllPlayers = () => {
	admin.removeAllPlayers();
	sock.refreshRooms();
};

const handleCurrentPlayerChange = (roomId: string, playerId: string) => {
	admin.setCurrentPlayer(roomId, playerId);
	sock.refreshRooms();
};

const handleKickPlayer = (roomId: string, playerId: string) => {
	admin.kickPlayer(roomId, playerId);
	sock.refreshRooms();
};

const handleToggleFastMode = (roomId: string) => {
	admin.toggleFastMode(roomId);
	sock.refreshRooms();
};

const handleRemoveRoom = (roomId: string) => {
	admin.removeRoom(roomId);
	sock.refreshRooms();
};

const selectedRoomId = ref('');
const showLogsModal = ref(false);

const handleShowRoomLogs = (roomId: string) => {
	selectedRoomId.value = roomId;
	showLogsModal.value = true;
};
</script>
<template>
	<div class="container mx-auto p-4">
		<h1 class="text-2xl font-bold mb-6"> Admin Panel <ULink v-if="isValidated" to="/admin/logs"
				class="text-blue-500 hover:underline ml-2 border-l border-gray-500 pl-2">View Server Logs</ULink>
			<!-- TODO turn logs into a collapsible -->
		</h1>
		<!-- Auth and Tools Grid -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
			<!-- Authentication -->
			<div class="p-4 bg-white dark:bg-neutral-800 rounded-lg shadow">
				<h2 class="text-xl font-semibold mb-2">Authentication</h2>
				<div class="flex flex-col gap-4">
					<UInput v-if="!isValidated" v-model="password" type="password" placeholder="Enter admin password" />
					<UButton v-if="!isValidated" @click="handlePasswordSubmit" color="primary"> Validate </UButton>
					<div v-else class="flex items-center gap-2">
						<div class="w-3 h-3 rounded-full bg-green-500"></div>
						<span>Password validated</span>
					</div>
				</div>
			</div>
			<!-- Admin Tools -->
			<div v-show="isValidated" class="md:col-span-2 p-4 bg-white dark:bg-neutral-800 rounded-lg shadow">
				<h2 class="text-xl font-semibold mb-2">Tools</h2>
				<div class="flex gap-4">
					<UButton @click="handleClearRooms" color="red" :disabled="!isValidated || sock.rooms.value.length === 0">
						Clear All Rooms </UButton>
					<UButton @click="handleRemoveAllPlayers" color="red" :disabled="!isValidated || totalPlayers.valueOf() === 0">
						Kick All Players </UButton>
				</div>
			</div>
		</div>
		<!-- Rooms List -->
		<div v-show="isValidated" class="bg-white dark:bg-neutral-800 rounded-lg shadow p-4">
			<h2 class="text-xl font-semibold mb-4 flex items-center gap-1">
				<span>{{ sock.rooms.value.length }} Active Rooms</span> | <span>{{ totalPlayers }} Players ({{ uniquePlayers }}
					unique) </span>
				<UButton @click="sock.refreshRooms" color="sky">
					<i class="i-heroicons-arrow-path-16-solid w-5 h-5"></i>
				</UButton>
			</h2>
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b dark:border-neutral-700">
							<th class="text-left p-2">ID</th>
							<th class="text-left p-2">Name</th>
							<th class="text-left p-2">Players</th>
							<th class="text-left p-2">Fast Model</th>
							<th class="text-left p-2">Current Turn</th>
							<th class="text-left p-2"></th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="room in sock.rooms.value" :key="room.id"
							class="border-b dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700">
							<td class="p-2">{{ room.id }}</td>
							<td class="p-2">
								<UButton @click="handleShowRoomLogs(room.id)" size="sm" variant="link"> {{ room.name }} </UButton>
							</td>
							<td class="p-2">
								<div v-for="player in room.players" :key="player.id" class="flex items-center gap-2">
									<UAvatar :src="`https://api.dicebear.com/7.x/identicon/svg?seed=${player.id}`" :alt="player.nickname"
										size="xs" /> {{ player.nickname }} <UButton @click="handleKickPlayer(room.id, player.id)"
										color="red" size="xs" variant="outline">
										<i class="i-heroicons-x-mark w-4 h-4"></i>
									</UButton>
								</div>
							</td>
							<td class="p-2 pl-8">
								<UButton @click="handleToggleFastMode(room.id)" size="xs" variant="outline"
									:color="room.fastMode ? 'yellow' : 'orange'"
									:title="room.fastMode ? 'Fast Mode is enabled' : 'Fast Mode is disabled'">
									<i :class="'w-5 h-5 ' + (room.fastMode ? 'i-heroicons-check' : 'i-heroicons-x-mark')"></i>
								</UButton>
							</td>
							<td class="p-2">
								<USelect v-if="room.players.length" v-model="room.currentPlayer"
									:options="room.players.map(p => ({ label: p.nickname, value: p.id }))"
									@update:modelValue="(value) => handleCurrentPlayerChange(room.id, value)">
								</USelect>
								<span v-else class="select-none text-muted" title="No players in this room"> -- </span>
							</td>
							<td class="p-2 flex gap-1">
								<UTooltip text="View room details">
									<UButton @click="handleShowRoomLogs(room.id)" color="sky" size="xs" variant="outline">
										<i class="i-heroicons-newspaper w-4 h-4"></i>
									</UButton>
								</UTooltip>
								<UTooltip text="Remove room">
									<UButton @click="handleRemoveRoom(room.id)" color="red" size="xs" variant="outline">
										<i class="i-heroicons-trash w-4 h-4"></i>
									</UButton>
								</UTooltip>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
		<RoomLogsModal v-model="showLogsModal" :room-id="selectedRoomId" />
	</div>
</template>

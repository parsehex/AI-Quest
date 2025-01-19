<template>
	<UModal v-model="isOpen" :ui="{ width: 'max-w-7xl' }">
		<h4 class="text-lg font-semibold ml-8 my-4"> Room Details </h4>
		<div v-if="room" class="mb-6 p-4 bg-gray-50 dark:bg-neutral-900 rounded-lg">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div>
					<div class="text-sm text-muted">Room Name</div>
					<div class="font-medium"> {{ room.name }} <NuxtLink :to="`/room/${room.id}`"
							class="ml-3 text-blue-500 hover:underline">Play</NuxtLink>
					</div>
				</div>
				<div>
					<div class="text-sm text-muted">Players</div>
					<div class="font-medium">{{ room.players.length }}</div>
				</div>
				<div>
					<div class="text-sm text-muted">Created By</div>
					<div class="font-medium">{{ room.createdBy }}</div>
				</div>
				<div class="col-span-2 md:col-span-4">
					<div class="text-sm text-muted">Premise</div>
					<div class="font-medium">{{ room.premise }}</div>
				</div>
			</div>
		</div>
		<h4 class="text-lg font-semibold ml-8 mb-4">Logs</h4>
		<!-- Filters Panel -->
		<div class="rounded-lg bg-gray-50 dark:bg-neutral-900 p-4 mb-6">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div>
					<label class="block text-sm font-medium text-muted mb-1">Log Level</label>
					<USelect v-model="filters.level" :options="levels" placeholder="All Levels" />
				</div>
				<div>
					<label class="block text-sm font-medium text-muted mb-1">From Date</label>
					<UInput type="datetime-local" v-model="filters.fromDate" />
				</div>
				<div class="flex items-end space-x-2">
					<UButton @click="fetchLogs" icon="i-heroicons-arrow-path"> Refresh </UButton>
					<UButton @click="exportLogs" icon="i-heroicons-arrow-down-tray" variant="outline"> Export </UButton>
				</div>
			</div>
		</div>
		<!-- Logs Table -->
		<div class="shadow rounded-lg overflow-hidden">
			<UTable :rows="logs" :columns="tableColumns">
				<template #timestamp-data="{ row }">{{ row.timestamp }}</template>
				<template #level-data="{ row }">
					<UBadge :label="row.level" :color="getLevelColor(row.level)" />
				</template>
				<template #context-data="{ row }">
					<UButton v-if="row.context" variant="link" @click="showContext(row)">View Context</UButton>
				</template>
			</UTable>
		</div>
		<!-- Context Modal -->
		<UModal v-model="isContextModalOpen" :ui="{ width: 'max-w-5xl' }">
			<template #header>Log Context</template>
			<JsonViewer v-if="selectedLog" :data="selectedLog.context" />
		</UModal>
	</UModal>
</template>
<script setup lang="ts">
import type { LogEntry, LogLevel } from '~/types/Logs';
import JsonViewer from '~/components/JsonViewer/Viewer.vue';

const props = defineProps<{
	modelValue: boolean,
	roomId: string
}>();

const sock = useGameSocket();
const toast = useToast();
const emit = defineEmits(['update:modelValue']);

const isOpen = computed({
	get: () => props.modelValue,
	set: (value) => emit('update:modelValue', value)
});

const levels = ['debug', 'info', 'warn', 'error'];
const logs = ref([] as LogEntry[]);
const isContextModalOpen = ref(false);
const selectedLog = ref(null as any);
const filters = ref({
	level: '',
	fromDate: '',
});

const room = computed(() => sock.rooms.value.find(r => r.id === props.roomId));

const tableColumns = [
	{ key: 'timestamp', label: 'Timestamp' },
	{ key: 'level', label: 'Level' },
	{ key: 'prefix', label: 'Prefix' },
	{ key: 'message', label: 'Message', class: 'max-w-lg break-words' },
	{ key: 'context', label: 'Context' }
];

const getLevelColor = (level: LogLevel) => {
	const colors = { debug: 'blue', info: 'green', warn: 'yellow', error: 'red' };
	return colors[level] || 'gray';
};

const showContext = (log: LogEntry) => {
	selectedLog.value = log;
	isContextModalOpen.value = true;
};

const fetchLogs = async () => {
	const savedPassword = localStorage.getItem('adminPassword');
	if (!savedPassword) {
		toast.add({
			title: 'No Password',
			description: 'Please fill the admin password'
		});
		return;
	}

	const body = { password: savedPassword, roomId: props.roomId } as Record<string, any>;
	if (filters.value.level) body.level = filters.value.level;
	if (filters.value.fromDate) body.from = filters.value.fromDate;

	try {
		logs.value = [...await $fetch('/api/admin/logs', {
			method: 'POST',
			body
		})];
		logs.value.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
	} catch (err: any) {
		if (err?.status === 401) {
			toast.add({
				title: 'Invalid Password',
				description: 'Please fill the correct password'
			});
		}
	}
};

const exportLogs = () => {
	const data = JSON.stringify(logs.value, null, 2);
	const blob = new Blob([data], { type: 'application/json' });
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `room-${props.roomId}-logs-${new Date().toISOString()}.json`;
	document.body.appendChild(a);
	a.click();
	window.URL.revokeObjectURL(url);
	document.body.removeChild(a);
};

watch(() => props.roomId, fetchLogs);
watch(filters, fetchLogs);
</script>

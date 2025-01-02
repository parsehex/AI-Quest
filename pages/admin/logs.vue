<template>
	<div class="min-h-screen p-4">
		<div class="max-w-7xl mx-auto">
			<!-- Header -->
			<div class="mb-6">
				<h1 class="text-2xl font-bold">System Logs</h1>
				<p class="text-muted">Monitor and analyze system activities</p>
			</div>
			<!-- Filters Panel -->
			<div class="rounded-lg shadow p-4 mb-6">
				<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
					<!-- Level Filter -->
					<div>
						<label class="block text-sm font-medium text-muted mb-1">Log Level</label>
						<USelect v-model="filters.level" :options="levels" placeholder="All Levels" />
					</div>
					<!-- Date Range -->
					<div>
						<label class="block text-sm font-medium text-muted mb-1">From Date</label>
						<UInput type="datetime-local" v-model="filters.fromDate"
							class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
					</div>
					<!-- Search -->
					<div>
						<label class="block text-sm font-medium text-muted mb-1">Search</label>
						<UInput type="text" v-model="filters.search" placeholder="Search in messages..."
							class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
					</div>
					<!-- Actions -->
					<div class="flex items-end space-x-2">
						<UButton @click="fetchLogs" icon="i-heroicons-arrow-path" color="primary"> Refresh </UButton>
						<UButton @click="exportLogs" icon="i-heroicons-arrow-down-tray" variant="outline"> Export </UButton>
					</div>
				</div>
			</div>
			<!-- Stats -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
				<div v-for="stat in stats" :key="stat.label" class="rounded-lg shadow p-4">
					<div class="text-sm font-medium text-gray-500">{{ stat.label }}</div>
					<div class="mt-1 text-2xl font-semibold" :class="stat.textColor"> {{ stat.value }} </div>
				</div>
			</div>
			<!-- Logs Table -->
			<div class="shadow rounded-lg overflow-hidden">
				<div class="overflow-x-auto">
					<UTable :rows="filteredLogs" :columns="tableColumns">
						<template #timestamp-data="{ row }"> {{ formatDate(row.timestamp) }} </template>
						<template #level-data="{ row }">
							<UBadge :label="row.level" :color="getLevelColor(row.level)" />
						</template>
						<template #context-data="{ row }">
							<UButton v-if="row.context" variant="link" @click="showContext(row)"> View Context </UButton>
						</template>
					</UTable>
				</div>
				<!-- Empty State -->
				<div v-if="filteredLogs.length === 0" class="text-center py-12">
					<!-- <IconInbox class="mx-auto h-12 w-12" /> -->
					<i class="i-heroicons-inbox w-12 h-12 mx-auto text-gray-400"></i>
					<h3 class="mt-2 text-sm font-medium">No logs found</h3>
					<p class="mt-1 text-sm text-gray-500"> Try adjusting your filters or changing the date range. </p>
				</div>
			</div>
		</div>
		<!-- Context Modal -->
		<UModal v-model="isModalOpen" :ui="{ width: 'max-w-2xl' }">
			<template #header> Log Context </template>
			<!-- TODO json viewer -->
			<pre class="rounded p-4 overflow-x-auto whitespace-pre-wrap break-words"><code>{{ JSON.stringify(selectedLog?.context,
				null, 2) }}</code></pre>
		</UModal>
	</div>
</template>
<script setup>
import { ref, computed } from 'vue'

const levels = ['debug', 'info', 'warn', 'error']
const isModalOpen = ref(false)
const selectedLog = ref(null)

const filters = ref({
	level: '',
	fromDate: '',
	search: '',
})

const logs = ref([])

const tableColumns = [
	{
		key: 'timestamp',
		label: 'Timestamp',
	},
	{
		key: 'level',
		label: 'Level',
	},
	{
		key: 'prefix',
		label: 'Prefix',
	},
	{
		key: 'message',
		label: 'Message',
		class: 'max-w-lg break-words'
	},
	{
		key: 'context',
		label: 'Context',
	}
]

const getLevelColor = (level) => {
	switch (level) {
		case 'debug': return 'blue'
		case 'info': return 'green'
		case 'warn': return 'yellow'
		case 'error': return 'red'
		default: return 'gray'
	}
}

const showContext = (log) => {
	selectedLog.value = log
	isModalOpen.value = true
}

const filteredLogs = computed(() => {
	return logs.value.filter(log => {
		if (filters.value.level && log.level !== filters.value.level) return false
		if (filters.value.search && !log.message.toLowerCase().includes(filters.value.search.toLowerCase())) return false
		if (filters.value.fromDate && new Date(log.timestamp) < new Date(filters.value.fromDate)) return false
		return true
	}).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
})

const stats = computed(() => {
	const total = filteredLogs.value.length
	return [
		{
			label: 'Total Logs',
			value: total,
			textColor: 'text-gray-400'
		},
		{
			label: 'Errors',
			value: filteredLogs.value.filter(log => log.level === 'error').length,
			textColor: 'text-red-600'
		},
		{
			label: 'Warnings',
			value: filteredLogs.value.filter(log => log.level === 'warn').length,
			textColor: 'text-yellow-600'
		},
		{
			label: 'Last 24h',
			value: filteredLogs.value.filter(log =>
				new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
			).length,
			textColor: 'text-indigo-600'
		}
	]
})

const fetchLogs = async () => {
	const params = new URLSearchParams()
	if (filters.value.level) params.append('level', filters.value.level)
	if (filters.value.fromDate) params.append('from', filters.value.fromDate)

	logs.value = [...await $fetch('/api/logs?' + params.toString())]
}

const exportLogs = () => {
	const data = JSON.stringify(filteredLogs.value, null, 2)
	const blob = new Blob([data], { type: 'application/json' })
	const url = window.URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = `logs-${new Date().toISOString()}.json`
	document.body.appendChild(a)
	a.click()
	window.URL.revokeObjectURL(url)
	document.body.removeChild(a)
}

const formatDate = (date) => new Date(date).toLocaleString()

// Auto-refresh
watch([filters], () => {
	fetchLogs()
})

onMounted(() => {
	fetchLogs()
})
</script>

<script setup>
const { refresh } = useProfile()
const isDev = import.meta.env.DEV
</script>
<template>
	<div class="bg-yellow-800 text-yellow-200 rounded-lg p-6 mb-4 max-w-md">
		<h3 class="text-lg font-semibold mb-2">Approval Pending</h3>
		<p class="text-sm"> You can browse and spectate games, but you must wait for admin approval before participating in
			games. </p>
		<UButton v-if="isDev" color="sky" size="sm" @click="refresh"> Refresh </UButton>
	</div>
</template>

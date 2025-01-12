<script setup lang="ts">
defineProps<{
	title?: string
	icon?: string
}>()
</script>
<template>
	<section class="bg-gray-800 rounded-lg p-6 transition-all duration-300">
		<header v-if="title" class="flex items-center justify-between mb-4">
			<h2 class="text-2xl font-bold flex items-center">
				<i v-if="icon" :class="icon + ' mr-2'" /> {{ title }}
			</h2>
			<slot name="header-right" />
		</header>
		<slot />
	</section>
</template>

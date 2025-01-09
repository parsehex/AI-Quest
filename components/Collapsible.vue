<script setup lang="ts">
const props = defineProps({
	title: {
		type: String,
		required: true
	},
	subtitle: {
		type: String,
		default: ''
	},
	initiallyExpanded: {
		type: Boolean,
		default: false
	},
	transparent: {
		type: Boolean,
		default: false
	}
});

const isExpanded = ref(props.initiallyExpanded);
</script>
<template>
	<UCard :ui="{
		header: { padding: 'p-0' },
		body: { padding: !isExpanded ? 'p-0' : undefined },
		background: props.transparent ? '' : undefined,
		ring: props.transparent ? '' : undefined,
		shadow: props.transparent ? '' : undefined,
		divide: props.transparent ? '' : undefined
	}">
		<template #header>
			<div class="flex items-center justify-between cursor-pointer select-none px-2 py-3 sm:px-6"
				@click="isExpanded = !isExpanded">
				<h2 class="text-xl">
					<span v-if="subtitle" class="block text-xs text-muted">{{ subtitle }}</span>
					<span>{{ title }}</span>
				</h2>
				<UButton icon="i-heroicons-chevron-down" variant="ghost" :class="{ 'rotate-180': isExpanded, 'ml-4': true }" />
			</div>
		</template>
		<template #default>
			<div v-if="isExpanded">
				<slot></slot>
			</div>
		</template>
	</UCard>
</template>
<style scoped>
.rotate-180 {
	transform: rotate(180deg);
	transition: transform 0.2s ease;
}
</style>

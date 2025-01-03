<script setup lang="ts">
import type { PlayerCharacter } from '~/types/Game';

const isExpanded = ref(false);
const displayName = ref('');
const character = ref({
	class: 'Warrior',
	race: 'Human',
	background: 'Noble',
	traits: [],
	skills: [],
	equipment: []
} as PlayerCharacter);

const characterOptions = {
	classes: ['', 'Warrior', 'Mage', 'Rogue', 'Cleric', 'Ranger'],
	races: ['', 'Human', 'Elf', 'Dwarf', 'Halfling', 'Orc'],
	backgrounds: ['', 'Noble', 'Merchant', 'Criminal', 'Soldier', 'Scholar']
};

const emit = defineEmits(['change']);

watch(() => character, () => {
	emit('change', character.value);
}, { deep: true });

onMounted(() => {
	const char = getPlayerCharacter();
	if (char) {
		character.value = { ...char };
	}

	const savedName = localStorage.getItem('nickname') || '';
	updateDisplayName(savedName);

	// open card if no details are saved
	let hasDetails = false;
	if (savedName) hasDetails = true;
	if (char) {
		if (char.class || char.race || char.background) hasDetails = true;
	}
	if (!hasDetails) isExpanded.value = true;
});

const updateDisplayName = (name: string) => {
	displayName.value = name || 'Anonymous';
};
</script>
<template>
	<UCard :ui="{ header: { padding: 'p-0' }, body: { padding: !isExpanded ? 'p-0' : undefined } }"
		:class="'create-character' + (isExpanded ? ' expanded' : '')">
		<template #header>
			<div class="flex items-center justify-between cursor-pointer px-2 py-3 sm:px-6" @click="isExpanded = !isExpanded">
				<h2 class="text-xl">
					<span v-if="!isExpanded" class="block text-xs text-muted">Character</span>
					<span v-if="!isExpanded">{{ displayName || 'Anonymous' }}</span>
					<span v-else>Customize Character</span>
				</h2>
				<UButton icon="i-heroicons-chevron-down" variant="ghost" :class="{ 'rotate-180': isExpanded }" />
			</div>
		</template>
		<template #default>
			<div v-if="isExpanded" class="space-y-2 flex flex-col justify-center">
				<div class="form-group">
					<label class="block text-sm font-medium mb-1">Name</label>
					<NicknameInput @update:name="updateDisplayName" />
				</div>
				<div class="form-group">
					<label class="block text-sm font-medium mb-1">Race</label>
					<USelect v-model="character.race" :options="characterOptions.races" />
				</div>
				<div class="form-group">
					<label class="block text-sm font-medium mb-1">Class</label>
					<USelect v-model="character.class" :options="characterOptions.classes" />
				</div>
				<div class="form-group">
					<label class="block text-sm font-medium mb-1">Background</label>
					<USelect v-model="character.background" :options="characterOptions.backgrounds" />
				</div>
			</div>
		</template>
	</UCard>
</template>
<style scoped lang="scss">
.form-group {
	@apply flex gap-2 items-center justify-between;

	&> :first-child {
		@apply mr-6;
	}
}
</style>

<script setup lang="ts">
import type { PlayerCharacter } from '~/types/Game';

const props = defineProps({
	readOnly: {
		type: Boolean,
		default: false
	}
});

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

const cardTitle = computed(() => {
	let title = displayName.value || 'Anonymous';
	if (character.value.race) title += ` the ${character.value.race}`;
	return title;
});
</script>
<template>
	<Collapsible :class="'create-character' + (isExpanded ? ' expanded' : '') + (props.readOnly ? ' readonly' : '')"
		:title="cardTitle" subtitle="You">
		<div class="space-y-2 flex flex-col justify-center">
			<div class="form-group">
				<label class="block text-sm font-medium mb-1">Name</label>
				<NicknameInput v-if="!readOnly" @update:name="updateDisplayName" />
				<p v-else>{{ displayName }}</p>
			</div>
			<div class="form-group">
				<label class="block text-sm font-medium mb-1">Race</label>
				<USelect v-model="character.race" :options="characterOptions.races" :disabled="readOnly" />
			</div>
			<div class="form-group">
				<label class="block text-sm font-medium mb-1">Class</label>
				<USelect v-model="character.class" :options="characterOptions.classes" :disabled="readOnly" />
			</div>
			<div class="form-group">
				<label class="block text-sm font-medium mb-1">Background</label>
				<USelect v-model="character.background" :options="characterOptions.backgrounds" :disabled="readOnly" />
			</div>
		</div>
	</Collapsible>
</template>
<style scoped lang="scss">
.form-group {
	@apply flex gap-2 items-center justify-between;

	&> :first-child {
		@apply mr-8;
	}
}
</style>

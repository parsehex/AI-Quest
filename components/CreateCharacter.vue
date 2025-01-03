<script setup lang="ts">
import type { PlayerCharacter } from '~/types/Game';

// TODO make this into a collapsible card
//   when collapsed, show character's name
//   open to view/modify characters
//   can manage multiple characters saved in local storage

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
	// console.log('Character changed:', character.value);
	emit('change', character.value);
}, { deep: true });

onMounted(() => {
	const char = getPlayerCharacter();
	if (char) {
		character.value = { ...char };
	}
});
</script>
<template>
	<div class="character-creation px-4">
		<h2 class="text-xl mb-4">Your Character</h2>
		<div class="space-y-2 flex flex-col items-center">
			<UTooltip text="Name">
				<NicknameInput />
			</UTooltip>
			<UTooltip text="Race">
				<USelect v-model="character.race" :options="characterOptions.races" />
			</UTooltip>
			<UTooltip text="Class">
				<USelect v-model="character.class" :options="characterOptions.classes" />
			</UTooltip>
			<UTooltip text="Background">
				<USelect v-model="character.background" :options="characterOptions.backgrounds" />
			</UTooltip>
		</div>
	</div>
</template>

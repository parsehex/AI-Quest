<script setup lang="ts">
import { CHARACTER_OPTIONS } from '~/lib/constants';
import type { PlayerCharacter } from '~/types/Game';

const props = defineProps({
	readOnly: {
		type: Boolean,
		default: false
	}
});

const CC = useCreateCharacter();
const isExpanded = ref(false);
const character = ref({
	class: 'Warrior',
	race: '',
	background: 'Noble',
	traits: [],
	skills: [],
	equipment: []
} as PlayerCharacter);

watch(() => character, () => {
	CC.setCharacter(character.value);
}, { deep: true });

onMounted(() => {
	const char = getPlayerCharacter();
	if (char) {
		character.value = { ...char };
	}

	// open card if no details are saved
	let hasDetails = false;
	if (CC.nameInput.value) hasDetails = true;
	if (char) {
		if (char.class || char.race || char.background) hasDetails = true;
	}
	if (!hasDetails) isExpanded.value = true;
});

const cardTitle = computed(() => {
	let title = CC.nameInput.value;
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
				<NicknameInput v-if="!readOnly" />
				<p v-else>{{ CC.nameInput.value }}</p>
			</div>
			<div class="form-group">
				<label class="block text-sm font-medium mb-1">Class</label>
				<USelect v-model="character.class" :options="CHARACTER_OPTIONS.classes" :disabled="readOnly" />
			</div>
			<div class="form-group">
				<label class="block text-sm font-medium mb-1">Background</label>
				<USelect v-model="character.background" :options="CHARACTER_OPTIONS.backgrounds" :disabled="readOnly" />
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

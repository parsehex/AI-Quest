<script setup lang="ts">
import type { RoomPlayerWithJoins } from '~/composables/useRoomPlayers';

const props = defineProps<{
	history: any[];
	players: RoomPlayerWithJoins[];
	loading?: boolean;
}>();

const groupedHistory = computed(() => {
	if (!props.history) return [];

	// 1. Sort history
	const sorted = [...props.history].sort((a: any, b: any) =>
		new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
	);

	// 2. Filter out the *latest* AI response (intro/narrative) at the end
	// These are displayed in the main Game component
	let endIndex = sorted.length - 1;
	while (endIndex >= 0) {
		const item = sorted[endIndex];
		if (item.type === 'intro' || item.type === 'narrative') {
			endIndex--;
		} else {
			break;
		}
	}

	// Also filter out the choice that led to this turn, as it's part of the "current" state being visualized
	if (endIndex >= 0 && sorted[endIndex].type === 'choice') {
		endIndex--;
	}

	// The history to display is everything up to endIndex
	const historyToDisplay = sorted.slice(0, endIndex + 1);

	// 3. Group by Turn
	// A turn starts with AI messages and ends with a Choice (usually)
	const turns: { turnNumber: number, items: any[] }[] = [];
	let currentTurnItems: any[] = [];
	let turnCount = 1;

	historyToDisplay.forEach((msg: any) => {
		// Resolve player name
		let playerName = 'Unknown';
		if (msg.player_id) {
			const player = props.players.find(p => p.user.id === msg.player_id);
			playerName = player?.character?.nickname || player?.user?.discord_username || 'Unknown';
		}
		const item = { ...msg, playerName };

		// Grouping Logic:
		// A turn typically consists of [Choice, Intro, Narrative].
		// The very first turn might just be [Intro, Narrative].
		// So, if we encounter a Choice, it starts a new turn group (unless it's the very first item, which we handle naturally).

		if (item.type === 'choice') {
			// If we have accumulated items for the previous turn, push them now.
			if (currentTurnItems.length > 0) {
				turns.push({ turnNumber: turnCount++, items: currentTurnItems });
				currentTurnItems = [];
			}
			// Start the new turn with this choice
			currentTurnItems.push(item);
		} else {
			// Intro or Narrative - add to current turn
			currentTurnItems.push(item);
		}
	});

	if (currentTurnItems.length > 0) {
		turns.push({ turnNumber: turnCount, items: currentTurnItems });
	}

	return turns.reverse();
});
</script>
<template>
	<div class="flex flex-col rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow mt-4">
		<div class="p-4 border-b dark:border-neutral-700">
			<h3 class="text-lg font-semibold text-muted">Game History</h3>
		</div>
		<div class="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
			<div v-if="loading" class="text-center py-4">
				<span class="text-muted">Loading history...</span>
			</div>
			<div v-else-if="groupedHistory.length === 0" class="text-muted text-center italic"> No history yet. </div>
			<div v-else class="space-y-6">
				<div v-for="turn in groupedHistory" :key="turn.turnNumber"
					class="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
					<h4 class="text-sm font-bold text-muted uppercase tracking-wider mb-2">Turn {{ turn.turnNumber }}</h4>
					<div class="prose dark:prose-invert max-w-none space-y-2">
						<div v-for="(msg, i) in turn.items" :key="i">
							<span v-if="msg.type === 'intro' || msg.type === 'narrative'">{{ msg.text }}</span>
							<span v-else-if="msg.type === 'choice'">
								<div class="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-md">
									<span class="text-muted">{{ msg.playerName }} chose: </span>
									<span class="font-bold">{{ msg.text }}</span>
								</div>
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">

const log = useLog('components/sidebar/Players')
const { room } = useThisRoom()
const { players } = useRoomPlayers()
const currentTurnPlayer = computed(() => players.value.find((p: any) => p.id === room.value?.current_player))
</script>
<template>
	<div class="p-4 border dark:border-neutral-700">
		<h3 class="text-lg font-bold mb-4">Players</h3>
		<ul class="flex flex-col gap-4">
			<li v-for="(player, index) in players" :key="index"
				class="flex items-center gap-3 p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
				<UAvatar
					:src="player.user.discord_avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${player.user.id}`"
					:alt="player.character?.nickname || 'Unknown'" size="md" />
				<div>
					<p class="font-bold">{{ player.character?.nickname || 'Unknown' }}</p>
					<p class="text-xs text-gray-500">{{ player.character?.race }} {{ player.character?.class }}</p>
					<p class="text-xs text-gray-400">@{{ player.user.discord_username }}</p>
				</div>
			</li>
		</ul>
	</div>
</template>

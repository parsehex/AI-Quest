<script setup lang="ts">
const log = useLog('components/sidebar/RoomDetails')
const { room } = useThisRoom()
const { players } = useRoomPlayers()
const currentTurnPlayer = computed(() => players.value.find((p: any) => p.id === room.value?.current_player))
</script>
<template>
	<div class="p-4 border dark:border-neutral-700">
		<CreateCharacter :read-only="true" />
		<ul class="mt-4 flex gap-4">
			<li v-for="(player, index) in players" :key="index"
				:class="'flex items-center gap-2' + (player.user.id === currentTurnPlayer?.user.id ? ' text-primary-500' : '')">
				<UAvatar :src="`https://api.dicebear.com/7.x/identicon/svg?seed=${player.user.id}`"
					:alt="player.character.nickname" size="sm" />
				<span class="text-sm">{{ player.character.nickname }}</span>
			</li>
		</ul>
	</div>
</template>

<script setup lang="ts">
import CreateCharacter from '../home/CreateCharacter.vue'

const log = useLog('components/sidebar/Players')
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
		<!-- TODO: cards for other player characters -->
	</div>
</template>

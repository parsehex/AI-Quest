import type { PlayerCharacter } from '~/types/Game'

export function useCharacter() {
	const character = reactive({
		current: null as PlayerCharacter | null,
		hasCharacter: false
	})

	const setCharacter = (newCharacter: PlayerCharacter) => {
		character.current = { ...newCharacter }
		character.hasCharacter = true
		localStorage.setItem('playerCharacter', JSON.stringify(newCharacter))
	}

	onMounted(() => {
		const saved = localStorage.getItem('playerCharacter')
		if (saved) {
			const parsed = JSON.parse(saved)
			setCharacter(parsed)
		}
	})

	return {
		character,
		setCharacter
	}
}

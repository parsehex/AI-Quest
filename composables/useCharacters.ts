import { useSupabaseClient, useSupabaseUser, useState } from '#imports'
import type { Database, Tables, TablesInsert, TablesUpdate } from '~/types/database.types'

export function useCharacters() {
	const client = useSupabaseClient<Database>()
	const user = useSupabaseUser()

	const characters = useState<Tables<'player_characters'>[]>('user_characters', () => [])
	const activeCharacterId = useState<string | null>('active_character_id', () => null)
	const loading = useState<boolean>('characters_loading', () => false)
	const error = useState<Error | null>('characters_error', () => null)

	const activeCharacter = computed(() =>
		characters.value.find(c => c.id === activeCharacterId.value) || null
	)

	async function fetchCharacters() {
		if (!user.value?.id) return

		loading.value = true
		error.value = null
		try {
			const { data, error: err } = await client
				.from('player_characters')
				.select('*')
				.eq('user_id', user.value.id)
				.order('created_at', { ascending: false })

			if (err) throw err
			characters.value = data || []

			// Set first character as active if none selected and we have characters
			if (!activeCharacterId.value && data && data.length > 0) {
				activeCharacterId.value = data[0].id
			}
		} catch (e) {
			error.value = e as Error
			console.error('Error fetching characters:', e)
		} finally {
			loading.value = false
		}
	}

	async function createCharacter(character: TablesInsert<'player_characters'>) {
		if (!user.value?.id) return null

		loading.value = true
		error.value = null
		try {
			const { data, error: err } = await client
				.from('player_characters')
				.insert({
					...character,
					user_id: user.value.id
				})
				.select()
				.single()

			if (err) throw err

			if (data) {
				characters.value.unshift(data)
				activeCharacterId.value = data.id
			}
			return data
		} catch (e) {
			error.value = e as Error
			console.error('Error creating character:', e)
			return null
		} finally {
			loading.value = false
		}
	}

	async function updateCharacter(id: string, updates: TablesUpdate<'player_characters'>) {
		loading.value = true
		error.value = null
		try {
			const { data, error: err } = await client
				.from('player_characters')
				.update(updates)
				.eq('id', id)
				.select()
				.single()

			if (err) throw err

			if (data) {
				const index = characters.value.findIndex(c => c.id === id)
				if (index !== -1) {
					characters.value[index] = data
				}
			}
			return data
		} catch (e) {
			error.value = e as Error
			console.error('Error updating character:', e)
			return null
		} finally {
			loading.value = false
		}
	}

	async function deleteCharacter(id: string) {
		loading.value = true
		error.value = null
		try {
			const { error: err } = await client
				.from('player_characters')
				.delete()
				.eq('id', id)

			if (err) throw err

			characters.value = characters.value.filter(c => c.id !== id)
			if (activeCharacterId.value === id) {
				activeCharacterId.value = characters.value[0]?.id || null
			}
			return true
		} catch (e) {
			error.value = e as Error
			console.error('Error deleting character:', e)
			return false
		} finally {
			loading.value = false
		}
	}

	// Watch for user changes to refetch
	watch(user, (newUser) => {
		if (newUser) {
			fetchCharacters()
		} else {
			characters.value = []
			activeCharacterId.value = null
		}
	}, { immediate: true })

	// Persist active character ID
	watch(activeCharacterId, (newId) => {
		if (import.meta.client) {
			if (newId) {
				localStorage.setItem('activeCharacterId', newId)
			} else {
				localStorage.removeItem('activeCharacterId')
			}
		}
	})

	// Initialize from localStorage if available (client-side only)
	if (import.meta.client && !activeCharacterId.value) {
		const storedId = localStorage.getItem('activeCharacterId')
		if (storedId) {
			activeCharacterId.value = storedId
		}
	}

	return {
		characters: readonly(characters),
		activeCharacterId,
		activeCharacter,
		loading: readonly(loading),
		error: readonly(error),
		fetchCharacters,
		createCharacter,
		updateCharacter,
		deleteCharacter
	}
}

import { useSupabaseClient, useSupabaseUser } from '#imports'
import type { Tables } from '~/types/database.types'

let instance: ReturnType<typeof createProfileStore> | null = null

function createProfileStore() {
	const client = useSupabaseClient()
	const user = useSupabaseUser()
	const profile = ref<Tables<'profiles'> | null>(null)
	const loading = ref(false)
	const error = ref<Error | null>(null)

	async function fetchProfile() {
		if (!user.value?.id) return null

		loading.value = true
		error.value = null

		try {
			const { data, error: err } = await client
				.from('profiles')
				.select('*')
				.eq('id', user.value.id)
				.single()

			if (err) throw err
			profile.value = data
			return data
		} catch (e) {
			error.value = e as Error
			return null
		} finally {
			loading.value = false
		}
	}

	// Auto-fetch profile when user changes
	watch(user, () => {
		if (user.value) {
			fetchProfile()
		} else {
			profile.value = null
		}
	}, { immediate: true })

	// Fetch profile immediately if user is already logged in
	if (user.value) {
		fetchProfile()
	}

	// Refresh profile occasionally
	if (!import.meta.server)
		setInterval(fetchProfile, 1000 * 60)

	return {
		profile: readonly(profile),
		loading: readonly(loading),
		error: readonly(error),
		refresh: fetchProfile
	}
}

export function useProfile() {
	if (!instance) {
		instance = createProfileStore()
	}
	return instance
}

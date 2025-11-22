import { useSupabaseClient, useSupabaseUser } from '#imports'
import type { Tables } from '~/types/database.types'

export function useProfile() {
	const client = useSupabaseClient<Tables<'profiles'>>()
	const user = useSupabaseUser()

	// Use useState to share state between server and client and avoid global state leaks on server
	const profile = useState<Tables<'profiles'> | null>('user_profile', () => null)
	const loading = useState<boolean>('profile_loading', () => false)
	const error = useState<Error | null>('profile_error', () => null)

	async function fetchProfile() {
		if (!user.value?.id) {
			profile.value = null
			return null
		}

		// If we already have the profile for this user, don't fetch again
		// (Simple cache strategy - can be improved)
		if (profile.value?.id === user.value.id) {
			return profile.value
		}

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

	// Watch for user changes
	watch(user, (newUser) => {
		if (newUser) {
			fetchProfile()
		} else {
			profile.value = null
		}
	}, { immediate: true })

	return {
		profile: readonly(profile),
		loading: readonly(loading),
		error: readonly(error),
		refresh: fetchProfile
	}
}

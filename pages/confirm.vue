<script setup lang="ts">
const user = useSupabaseUser()

// Get redirect path from cookies
const cookieName = useRuntimeConfig().public.supabase.cookieName
const redirectPath = useCookie(`${cookieName}-redirect-path`).value

watch(user, () => {
	if (user.value) {
		console.log('user', user.value, 'redirectPath', redirectPath);

		// Clear cookie
		useCookie(`${cookieName}-redirect-path`).value = null
		// Redirect to path
		return navigateTo(redirectPath || '/');
	}
}, { immediate: true })
</script>
<template>
	<div>Waiting for login...</div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()
const router = useRouter()
const loading = ref(true)
const error = ref('')

onMounted(async () => {
	try {
		const { error: logoutError } = await supabase.auth.signOut()
		if (logoutError) throw logoutError
		// @ts-ignore
		window.location.href = '/'
	} catch (e: any) {
		error.value = e.message
	} finally {
		loading.value = false
	}
})
</script>
<template>
	<UContainer class="min-h-screen flex items-center justify-center">
		<UCard class="w-full max-w-md">
			<template #header>
				<h1 class="text-xl font-bold">Logging out...</h1>
			</template>
			<div class="space-y-4">
				<template v-if="loading">
					<Spinner />
				</template>
				<template v-else-if="error">
					<p class="text-red-500">{{ error }}</p>
					<UButton @click="router.push('/login')">Return to Login</UButton>
				</template>
				<template v-else>
					<p>Redirecting...</p>
					<a href="/" class="text-orange-500">Return to Home</a>
				</template>
			</div>
		</UCard>
	</UContainer>
</template>

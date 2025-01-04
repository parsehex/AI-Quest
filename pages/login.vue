<script setup lang="ts">
const supabase = useSupabaseClient()
const email = ref('')
const loading = ref(false)
const error = ref('')

const signInWithPasswordless = async () => {
	if (!email.value) {
		error.value = 'Please enter an email address'
		return
	}

	loading.value = true
	error.value = ''

	try {
		const { error: authError } = await supabase.auth.signInWithOtp({
			email: email.value,
			options: {
				emailRedirectTo: 'http://localhost:3000/confirm',
			}
		})
		if (authError) throw authError

		// Show success message
		error.value = 'Check your email for the login link!'
	} catch (e: any) {
		error.value = e.message
	} finally {
		loading.value = false
	}
}

const signInWithDiscord = async () => {
	loading.value = true
	error.value = ''

	try {
		const { error: authError } = await supabase.auth.signInWithOAuth({
			provider: 'discord',
			options: {
				redirectTo: '/confirm',
				scopes: 'identify email',
			}
		})
		if (authError) throw authError
	} catch (e: any) {
		error.value = e.message
	} finally {
		loading.value = false
	}
}
</script>
<template>
	<UContainer class="flex justify-center">
		<UCard class="w-full max-w-md">
			<template #header>
				<h1 class="text-xl font-bold">Login</h1>
			</template>
			<p v-if="error" class="text-red-500">{{ error }}</p>
			<div class="flex flex-col space-y-4">
				<UButton @click="signInWithDiscord" :loading="loading" color="purple">
					<img src="/assets/icons/brand-discord.svg" alt="Discord" class="w-6 h-6 inline-block mr-2" /> Login with
					Discord
				</UButton>
				<p class="text-center select-none">&mdash; or &mdash;</p>
				<UInput v-model="email" type="email" placeholder="Email" />
				<UButton @click="signInWithPasswordless" :loading="loading">Login with Email</UButton>
			</div>
		</UCard>
	</UContainer>
</template>

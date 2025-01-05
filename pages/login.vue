<script setup lang="ts">
const supabase = useSupabaseClient()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')
const isSignUp = ref(false)
const usePassword = ref(false)

const handleAuthSubmit = async () => {
	if (!email.value) {
		error.value = 'Please enter an email address'
		return
	}

	loading.value = true
	error.value = ''
	success.value = ''

	try {
		if (usePassword.value) {
			if (!password.value) {
				error.value = 'Please enter a password'
				return
			}

			if (isSignUp.value) {
				const { error: authError } = await supabase.auth.signUp({
					email: email.value,
					password: password.value,
					options: {
						emailRedirectTo: 'http://localhost:3000/confirm',
					}
				})
				if (authError) throw authError
				success.value = 'Check your email to confirm your account!'
			} else {
				const { error: authError } = await supabase.auth.signInWithPassword({
					email: email.value,
					password: password.value,
				})
				if (authError) throw authError

				// Redirect to home page
				window.location.href = '/'
			}
		} else {
			const { error: authError } = await supabase.auth.signInWithOtp({
				email: email.value,
				options: {
					emailRedirectTo: 'http://localhost:3000/confirm',
				}
			})
			if (authError) throw authError
			success.value = 'Check your email for the login link!'
		}
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

const resetForm = () => {
	email.value = ''
	password.value = ''
	error.value = ''
	success.value = ''
}

const headerText = computed(() => isSignUp.value ? 'Sign Up' : 'Login')
const discordButtonText = computed(() => isSignUp.value ? 'Sign up' : 'Login')
const submitButtonText = computed(() => isSignUp.value ? 'Sign Up' : 'Login')
const submitButtonSuffix = computed(() => usePassword.value ? ' with Password' : ' with Magic Link')
const toggleText = computed(() => isSignUp.value ? 'Already have an account?' : "Don't have an account?")
const toggleButtonText = computed(() => isSignUp.value ? 'Login' : 'Sign Up')
</script>
<template>
	<UContainer class="flex justify-center">
		<UCard class="w-full max-w-md">
			<template #header>
				<h1 class="text-xl font-bold">{{ headerText }}</h1>
			</template>
			<div class="flex flex-col space-y-4">
				<!-- Error and Success Messages -->
				<p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
				<p v-if="success" class="text-green-500 text-sm">{{ success }}</p>
				<!-- Discord Login -->
				<UButton @click="signInWithDiscord" :loading="loading" color="purple">
					<img src="/assets/icons/brand-discord.svg" alt="Discord" class="w-6 h-6 inline-block mr-2" /> {{
						discordButtonText }} with Discord
				</UButton>
				<p class="text-center select-none">&mdash; or &mdash;</p>
				<!-- Email/Password Form -->
				<form @submit.prevent="handleAuthSubmit" class="space-y-4">
					<UInput v-model="email" type="email" placeholder="Email" :disabled="loading" />
					<!-- Password Toggle -->
					<div class="flex items-center space-x-2">
						<UCheckbox v-model="usePassword" label="Use password" />
					</div>
					<!-- Password Input (conditional) -->
					<UInput v-if="usePassword" v-model="password" type="password" placeholder="Password" :disabled="loading" />
					<!-- Submit Button -->
					<UButton type="submit" :loading="loading" block> {{ submitButtonText }}{{ submitButtonSuffix }} </UButton>
				</form>
				<!-- Toggle Sign Up/Login -->
				<div class="text-center text-sm">
					<span class="text-gray-600"> {{ toggleText }} </span>
					<button @click="() => { isSignUp = !isSignUp; resetForm() }" class="text-primary-600 hover:underline ml-1"> {{
						toggleButtonText }} </button>
				</div>
			</div>
		</UCard>
	</UContainer>
</template>

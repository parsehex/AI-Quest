<script setup lang="ts">
const supabase = useSupabaseClient()
const email = ref('')

const signInWithOtp = async () => {
	const { error, data } = await supabase.auth.signInWithOtp({
		email: email.value,
		options: {
			emailRedirectTo: 'http://localhost:3000/confirm',
		}
	})
	if (error) console.log(error)
	if (data) console.log(data)
}
</script>
<template>
	<div>
		<input v-model="email" type="email" id="email" name="email" placeholder="Email" required>
		<br />
		<button @click="signInWithOtp"> Sign In with E-Mail </button>
	</div>
</template>

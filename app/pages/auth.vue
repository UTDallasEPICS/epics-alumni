<script setup lang="ts">
import { z } from 'zod'
import { authClient } from '../utils/auth-client'

const toast = useToast()
const isEmailSent = ref(false)

const schema = computed(() => {
  if (!isEmailSent.value) {
    return z.object({
      email: z.string().email('Enter a valid email address'),
    })
  }

  return z.object({
    email: z.string().email('Enter a valid email address'),
    otp: z.array(z.string()).length(6, 'Enter all 6 digits'),
  })
})

const state = reactive({
  email: '',
  otp: [] as string[],
})

async function handleSubmit() {
  if (!isEmailSent.value) {
    const { error } =
      await authClient.emailOtp.sendVerificationOtp({
        email: state.email,
        type: 'sign-in',
      })

    if (error) {
      toast.add({
        title: 'Error',
        description: error.message,
        color: 'error',
      })
    } else {
      isEmailSent.value = true

      toast.add({
        title: 'Success',
        description: 'A login code was sent to your email',
        color: 'success',
      })
    }
  } else {
    const { error } = await authClient.signIn.emailOtp({
      email: state.email,
      otp: state.otp.join(''),
    })

    if (error) {
      toast.add({
        title: 'Error',
        description: error.message,
        color: 'error',
      })
    } else {
      // Opens the dashboard from your second code file.
      await navigateTo('/', { external: true })
    }
  }
}

function changeEmail() {
  isEmailSent.value = false
  state.otp = []
}
</script>

<template>
  <main class="login-page">
    <section class="login-card">
    <img
      src="/images/epics-logo.png"
      alt="UT Dallas EPICS"
      class="epics-logo-image"
    />

      <div class="login-heading">
        <h1>Welcome User </h1>

        <p v-if="!isEmailSent">
          Enter your email to receive a OTP.
        </p>

        <p v-else>
          Enter the six-digit code sent to
          <strong>{{ state.email }}</strong>.
        </p>
      </div>

      <UForm
        :schema="schema"
        :state="state"
        class="login-form"
        @submit="handleSubmit"
      >
        <UFormField
          v-if="!isEmailSent"
          name="email"
          :ui="{ error: 'hidden' }"
        >
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="email"
            placeholder="johndoe@example.com"
            size="xl"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-else
          name="otp"
          label="Verification code"
        >
          <UPinInput
            v-model="state.otp"
            otp
            :length="6"
            size="xl"
            class="pin-input"
          />
        </UFormField>

        <UButton
          loading-auto
          type="submit"
          size="xl"
          class="login-button"
        >
          {{ isEmailSent ? 'Sign in' : 'Send code' }}
        </UButton>

        <button
          v-if="isEmailSent"
          type="button"
          class="change-email-button"
          @click="changeEmail"
        >
          Use a different email
        </button>
      </UForm>


    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 20px;
  background-color: #154734;
}



.login-card {
  width: min(100%, 430px);
  padding: 44px 42px 36px;
  border: 1px solid rgba(0, 0, 0, 0.55);
  border-radius: 18px;
  background: #ffffff;
}

.epics-logo-image {
  display: block;
  width: 190px;
  max-width: 100%;
  height: auto;
  margin-bottom: 28px;
  object-fit: contain;
}

.eyebrow {
  margin: 0 0 8px;
  color: #bd531f;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #000000;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 2rem;
  line-height: 1.1;
}

.login-heading > p:last-child {
  margin: 10px 0 0;
  color: #000000;
  font-size: 0.95rem;
  line-height: 1.55;
}

.login-form {
  display: grid;
  gap: 22px;
}

.pin-input {
  display: flex;
  justify-content: space-between;
}

/* CHANGE THE BUTTON AND “SEND CODE” COLORS HERE */
.login-button {
  width: 100%;
  justify-content: center;

  /* Button background */
  background: #df6c2c;

  /* “Send code” text color */
  color: #ffffff;

  border-radius: 8px;
  font-weight: 750;
  box-shadow: 0 8px 18px rgb(223 108 44 / 22%);
}

/* CHANGE THE BUTTON HOVER COLOR HERE */
.login-button:hover {
  background: #bd531f;
}

.change-email-button {
  margin: -8px auto 0;
  color: #124f3d;
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.help-text {
  margin: 30px 0 0;
  color: #000000;
  font-size: 0.78rem;
  text-align: center;
}

@media (max-width: 520px) {
  .login-card {
    padding: 34px 24px 28px;
  }
}
</style>
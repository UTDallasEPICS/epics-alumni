<script setup lang="ts">
  const fullName = ref('')
  const email = ref('')

  function handleContinue() {
    console.log('Create account:', {
      fullName: fullName.value,
      email: email.value,
    })

    // We will connect this to OTP/email verification later.
  }
</script>

<template>
  <div class="create-account-page">
    <div class="account-card">
      <!-- Logo -->
      <NuxtLink to="/" class="logo-link" aria-label="Go to home">
        <img src="/images/epics-logo.png" alt="EPICS logo" class="logo" />
      </NuxtLink>

      <!-- Heading -->
      <div class="header">
        <h1>Create your account</h1>

        <p>Join the EPICS community and connect with students, alumni, and past projects.</p>
      </div>

      <!-- Form -->
      <form class="account-form" @submit.prevent="handleContinue">
        <div class="field">
          <label for="full-name"> Full name </label>

          <div class="input-wrapper">
            <span class="material-symbols-outlined field-icon"> person </span>

            <input
              id="full-name"
              v-model="fullName"
              type="text"
              placeholder="Enter your full name"
              autocomplete="name"
              required
            />
          </div>
        </div>

        <div class="field">
          <label for="email"> Email </label>

          <div class="input-wrapper">
            <span class="material-symbols-outlined field-icon"> mail </span>

            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="Enter your email"
              autocomplete="email"
              required
            />
          </div>

          <p class="field-help">We’ll use this email to verify your account.</p>
        </div>

        <button type="submit" class="continue-button">
          Continue

          <span class="material-symbols-outlined"> arrow_forward </span>
        </button>
      </form>

      <!-- Sign In -->
      <div class="signin-section">
        <span>Already have an account?</span>

        <NuxtLink to="/auth" class="signin-link"> Sign in </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .create-account-page {
    min-height: calc(100vh - 86px);
    background-color: #f3f4f3;

    display: flex;
    justify-content: center;
    align-items: flex-start;

    padding: 64px 24px;
    box-sizing: border-box;
  }

  .account-card {
    width: 100%;
    max-width: 520px;

    background-color: white;

    border: 1px solid #dee4e0;
    border-radius: 18px;

    padding: 42px;
    box-sizing: border-box;

    box-shadow: 0 8px 28px rgba(21, 71, 52, 0.08);
  }

  /* Logo */

  .logo-link {
    display: inline-flex;
    align-items: center;

    margin-bottom: 28px;
  }

  .logo {
    width: 92px;
    height: auto;
  }

  /* Heading */

  .header {
    margin-bottom: 32px;
  }

  .header h1 {
    margin: 0;

    color: #202823;

    font-size: 32px;
    font-weight: 700;
    line-height: 1.2;
  }

  .header p {
    margin: 12px 0 0;

    color: #66716b;

    font-size: 16px;
    line-height: 1.6;
  }

  /* Form */

  .account-form {
    display: flex;
    flex-direction: column;

    gap: 24px;
  }

  .field {
    display: flex;
    flex-direction: column;

    gap: 8px;
  }

  .field label {
    color: #202823;

    font-size: 14px;
    font-weight: 600;
  }

  .input-wrapper {
    height: 52px;

    display: flex;
    align-items: center;

    background-color: #ffffff;

    border: 1px solid #ccd5d0;
    border-radius: 12px;

    padding: 0 14px;

    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .input-wrapper:focus-within {
    border-color: #154734;
    box-shadow: 0 0 0 3px rgba(21, 71, 52, 0.1);
  }

  .field-icon {
    color: #66716b;

    font-size: 22px;

    margin-right: 10px;
  }

  .input-wrapper input {
    width: 100%;

    border: none;
    outline: none;

    background: transparent;

    color: #202823;

    font-size: 16px;
  }

  .input-wrapper input::placeholder {
    color: #97a19b;
  }

  .field-help {
    margin: 0;

    color: #7a857f;

    font-size: 13px;
    line-height: 1.4;
  }

  /* Button */

  .continue-button {
    width: 100%;
    height: 52px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 8px;

    border: none;
    border-radius: 12px;

    background-color: #154734;
    color: white;

    font-size: 16px;
    font-weight: 600;

    cursor: pointer;

    transition:
      background-color 0.2s ease,
      transform 0.15s ease;
  }

  .continue-button:hover {
    background-color: #1d5a43;
  }

  .continue-button:active {
    transform: scale(0.99);
  }

  .continue-button .material-symbols-outlined {
    font-size: 21px;
  }

  /* Sign In */

  .signin-section {
    margin-top: 28px;
    padding-top: 24px;

    border-top: 1px solid #e5e9e6;

    display: flex;
    justify-content: center;
    align-items: center;

    gap: 6px;

    color: #66716b;

    font-size: 14px;
  }

  .signin-link {
    color: #154734;

    font-weight: 600;
    text-decoration: none;
  }

  .signin-link:hover {
    text-decoration: underline;
  }

  /* Responsive */

  @media (max-width: 600px) {
    .create-account-page {
      padding: 32px 16px;
    }

    .account-card {
      padding: 30px 22px;

      border-radius: 16px;
    }

    .header h1 {
      font-size: 28px;
    }

    .header p {
      font-size: 15px;
    }
  }
</style>

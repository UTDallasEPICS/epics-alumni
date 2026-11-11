<script setup lang="ts">
  const currentStep = ref(1)
  const totalSteps = 4

  const form = reactive({
    fullName: '',
    email: '',
    verificationCode: '',
    profileType: '',
    graduationYear: '',
    linkedinUrl: '',
    about: '',
  })

  const emailVerified = ref(false)

  const stepTitles = [
    'Create your account',
    'Verify your email',
    'Tell us about yourself',
    'Complete your profile',
  ]

  const stepDescriptions = [
    'Join the EPICS community and connect with students, alumni, and past projects.',
    `We sent a verification code to ${form.email || 'your email'}.`,
    'Help the EPICS community understand who you are.',
    'Add some optional professional information. You can always update this later.',
  ]

  function nextStep() {
    if (currentStep.value < totalSteps) {
      currentStep.value++
    }
  }

  function previousStep() {
    if (currentStep.value > 1) {
      currentStep.value--
    }
  }

  function handleAccountStep() {
    if (!form.fullName || !form.email) {
      return
    }

    // Later:
    // Call POST /api/auth/send-otp here.

    nextStep()
  }

  function handleVerification() {
    if (!form.verificationCode) {
      return
    }

    // TEMPORARY UI ONLY:
    // Later this will call POST /api/auth/verify-otp.
    emailVerified.value = true

    nextStep()
  }

  function handleProfileBasics() {
    if (!form.profileType) {
      return
    }

    nextStep()
  }

  function finishSignup() {
    if (!emailVerified.value) {
      return
    }

    // Nothing is being saved yet.
    // Later this will call the final create-account API.
    console.log('Finished account setup:', form)
  }
</script>

<template>
  <div class="create-account-page">
    <div class="account-card">
      <!-- Logo -->
      <NuxtLink to="/" class="logo-link" aria-label="Go to home">
        <img src="/images/epics-logo.png" alt="EPICS logo" class="logo" />
      </NuxtLink>

      <!-- Progress -->
      <div class="progress-section">
        <div class="progress-info">
          <span>Step {{ currentStep }} of {{ totalSteps }}</span>
          <span>{{ Math.round((currentStep / totalSteps) * 100) }}%</span>
        </div>

        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
          ></div>
        </div>
      </div>

      <!-- Heading -->
      <div class="header">
        <h1>{{ stepTitles[currentStep - 1] }}</h1>

        <p>{{ stepDescriptions[currentStep - 1] }}</p>
      </div>

      <!-- STEP 1: Account -->
      <form v-if="currentStep === 1" class="account-form" @submit.prevent="handleAccountStep">
        <div class="field">
          <label for="full-name">Full name</label>

          <div class="input-wrapper">
            <span class="material-symbols-outlined field-icon"> person </span>

            <input
              id="full-name"
              v-model="form.fullName"
              type="text"
              placeholder="Enter your full name"
              autocomplete="name"
              required
            />
          </div>
        </div>

        <div class="field">
          <label for="email">Email</label>

          <div class="input-wrapper">
            <span class="material-symbols-outlined field-icon"> mail </span>

            <input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="Enter your email"
              autocomplete="email"
              required
            />
          </div>

          <p class="field-help">We’ll verify this email before you continue.</p>
        </div>

        <button type="submit" class="primary-button">
          Continue

          <span class="material-symbols-outlined"> arrow_forward </span>
        </button>
      </form>

      <!-- STEP 2: Email Verification -->
      <form v-else-if="currentStep === 2" class="account-form" @submit.prevent="handleVerification">
        <div class="verification-icon">
          <span class="material-symbols-outlined"> mark_email_read </span>
        </div>

        <div class="field">
          <label for="verification-code"> Verification code </label>

          <div class="input-wrapper">
            <span class="material-symbols-outlined field-icon"> password </span>

            <input
              id="verification-code"
              v-model="form.verificationCode"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="Enter verification code"
              required
            />
          </div>

          <p class="field-help">Enter the code sent to {{ form.email }}.</p>
        </div>

        <div class="button-row">
          <button type="button" class="secondary-button" @click="previousStep">
            <span class="material-symbols-outlined"> arrow_back </span>

            Back
          </button>

          <button type="submit" class="primary-button">
            Verify

            <span class="material-symbols-outlined"> check </span>
          </button>
        </div>
      </form>

      <!-- STEP 3: Profile Basics -->
      <form
        v-else-if="currentStep === 3"
        class="account-form"
        @submit.prevent="handleProfileBasics"
      >
        <div class="field">
          <label>I am a...</label>

          <div class="profile-options">
            <button
              type="button"
              class="profile-option"
              :class="{ selected: form.profileType === 'Student' }"
              @click="form.profileType = 'Student'"
            >
              <span class="material-symbols-outlined"> school </span>

              <span>Student</span>
            </button>

            <button
              type="button"
              class="profile-option"
              :class="{ selected: form.profileType === 'Alumni' }"
              @click="form.profileType = 'Alumni'"
            >
              <span class="material-symbols-outlined"> workspace_premium </span>

              <span>Alumni</span>
            </button>

            <button
              type="button"
              class="profile-option"
              :class="{ selected: form.profileType === 'Mentor' }"
              @click="form.profileType = 'Mentor'"
            >
              <span class="material-symbols-outlined"> groups </span>

              <span>Mentor</span>
            </button>
          </div>
        </div>

        <div v-if="form.profileType === 'Student' || form.profileType === 'Alumni'" class="field">
          <label for="graduation-year"> Graduation year </label>

          <div class="input-wrapper">
            <span class="material-symbols-outlined field-icon"> calendar_month </span>

            <input
              id="graduation-year"
              v-model="form.graduationYear"
              type="number"
              placeholder="Example: 2027"
              min="2000"
              max="2100"
            />
          </div>
        </div>

        <div class="button-row">
          <button type="button" class="secondary-button" @click="previousStep">
            <span class="material-symbols-outlined"> arrow_back </span>

            Back
          </button>

          <button type="submit" class="primary-button" :disabled="!form.profileType">
            Continue

            <span class="material-symbols-outlined"> arrow_forward </span>
          </button>
        </div>
      </form>

      <!-- STEP 4: Professional Info -->
      <form v-else-if="currentStep === 4" class="account-form" @submit.prevent="finishSignup">
        <div class="field">
          <label for="linkedin">
            LinkedIn
            <span class="optional">(optional)</span>
          </label>

          <div class="input-wrapper">
            <span class="material-symbols-outlined field-icon"> link </span>

            <input
              id="linkedin"
              v-model="form.linkedinUrl"
              type="url"
              placeholder="LinkedIn profile URL"
            />
          </div>
        </div>

        <div class="field">
          <label for="about">
            About me
            <span class="optional">(optional)</span>
          </label>

          <textarea
            id="about"
            v-model="form.about"
            class="textarea"
            placeholder="Tell the EPICS community a little about yourself..."
            maxlength="500"
          ></textarea>

          <p class="character-count">{{ form.about.length }}/500</p>
        </div>

        <div class="button-row">
          <button type="button" class="secondary-button" @click="previousStep">
            <span class="material-symbols-outlined"> arrow_back </span>

            Back
          </button>

          <button type="submit" class="primary-button">
            Finish

            <span class="material-symbols-outlined"> check_circle </span>
          </button>
        </div>
      </form>

      <!-- TEMPORARY: Skip steps while testing the UI -->
      <button
        v-if="currentStep < totalSteps"
        type="button"
        class="dev-button"
        @click="currentStep++"
      >
        Skip for testing
      </button>

      <!-- Sign In -->
      <div v-if="currentStep === 1" class="signin-section">
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
    max-width: 540px;

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

  /* Progress */

  .progress-section {
    margin-bottom: 28px;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;

    margin-bottom: 8px;

    color: #66716b;

    font-size: 13px;
    font-weight: 600;
  }

  .progress-bar {
    width: 100%;
    height: 6px;

    background-color: #e6ebe8;

    border-radius: 999px;

    overflow: hidden;
  }

  .progress-fill {
    height: 100%;

    background-color: #154734;

    border-radius: 999px;

    transition: width 0.3s ease;
  }

  /* Header */

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

  .optional {
    color: #87918b;

    font-weight: 400;
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

  .input-wrapper input::placeholder,
  .textarea::placeholder {
    color: #97a19b;
  }

  .field-help {
    margin: 0;

    color: #7a857f;

    font-size: 13px;
    line-height: 1.4;
  }

  /* Verification */

  .verification-icon {
    width: 66px;
    height: 66px;

    display: flex;
    align-items: center;
    justify-content: center;

    margin: 0 auto;

    background-color: #edf5f1;
    color: #154734;

    border-radius: 50%;
  }

  .verification-icon .material-symbols-outlined {
    font-size: 34px;
  }

  /* Profile Type */

  .profile-options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);

    gap: 10px;
  }

  .profile-option {
    min-height: 96px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: 8px;

    background-color: white;
    color: #66716b;

    border: 1px solid #ccd5d0;
    border-radius: 12px;

    font-size: 14px;
    font-weight: 600;

    cursor: pointer;

    transition:
      border-color 0.2s ease,
      background-color 0.2s ease,
      color 0.2s ease;
  }

  .profile-option:hover {
    border-color: #154734;
  }

  .profile-option.selected {
    background-color: #edf5f1;
    border-color: #154734;
    color: #154734;
  }

  .profile-option .material-symbols-outlined {
    font-size: 28px;
  }

  /* About */

  .textarea {
    min-height: 130px;

    resize: vertical;

    border: 1px solid #ccd5d0;
    border-radius: 12px;
    outline: none;

    padding: 14px;

    color: #202823;

    font-family: inherit;
    font-size: 15px;
    line-height: 1.5;

    box-sizing: border-box;

    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .textarea:focus {
    border-color: #154734;
    box-shadow: 0 0 0 3px rgba(21, 71, 52, 0.1);
  }

  .character-count {
    margin: 0;

    align-self: flex-end;

    color: #87918b;

    font-size: 12px;
  }

  /* Buttons */

  .button-row {
    display: flex;

    gap: 12px;
  }

  .primary-button,
  .secondary-button {
    height: 52px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 8px;

    border-radius: 12px;

    font-size: 16px;
    font-weight: 600;

    cursor: pointer;
  }

  .primary-button {
    flex: 1;

    border: none;

    background-color: #154734;
    color: white;
  }

  .primary-button:hover {
    background-color: #1d5a43;
  }

  .primary-button:disabled {
    background-color: #aeb9b3;

    cursor: not-allowed;
  }

  .secondary-button {
    border: 1px solid #ccd5d0;

    background-color: white;
    color: #154734;

    padding: 0 20px;
  }

  .secondary-button:hover {
    background-color: #f3f6f4;
  }

  .primary-button .material-symbols-outlined,
  .secondary-button .material-symbols-outlined {
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

  .dev-button {
    width: 100%;

    margin-top: 18px;

    border: none;
    background: transparent;

    color: #66716b;

    font-size: 13px;
    text-decoration: underline;

    cursor: pointer;
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

    .profile-options {
      grid-template-columns: 1fr;
    }
  }
</style>

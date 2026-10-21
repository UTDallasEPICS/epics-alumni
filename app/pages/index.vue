<script setup lang="ts">
import { authClient } from '../utils/auth-client'
import { profileUpdateSchema, type ProfileResponse } from '../../shared/profile'

type ProfileRole = 'Alum' | 'Admin' | 'Mentor' | 'Student'

interface ProfileProject {
  id?: string
  name: string
  contribution: string
  featured: boolean
}

interface Profile extends ProfileResponse {
  roles: ProfileRole[]
  projects: ProfileProject[]
}

const toast = useToast()

const profile = ref<Profile | null>(null)
const pending = ref(true)
const errorMessage = ref('')
const isEditing = ref(false)
const isSaving = ref(false)
const selectedFile = ref<File | null>(null)
const imagePreview = ref('')

const form = reactive({
  name: '',
  email: '',
  graduationYear: '',
  biography: '',
  projects: [] as ProfileProject[],
})

const roleClasses: Record<ProfileRole, string> = {
  Alum: 'role-alum',
  Admin: 'role-admin',
  Mentor: 'role-mentor',
  Student: 'role-student',
}

const profileInitials = computed(() => {
  if (!profile.value?.name) {
    return '?'
  }

  return profile.value.name
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
})

const displayedImage = computed(() => {
  return imagePreview.value || profile.value?.imageUrl || ''
})

const contactLink = computed(() => {
  return profile.value?.email
    ? `mailto:${profile.value.email}`
    : '#'
})

function copyProjects(projects: ProfileProject[]) {
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    contribution: project.contribution,
    featured: project.featured,
  }))
}

async function loadProfile() {
  pending.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<ProfileResponse>('/api/profile')
    profile.value = { ...response, roles: [], projects: [] }
  } catch (error) {
    console.error('Unable to load profile:', error)

    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Unable to load the profile.'
  } finally {
    pending.value = false
  }
}

async function logout() {
  await authClient.signOut()
  await navigateTo('/auth', { external: true })
}

function startEditing() {
  if (!profile.value) {
    return
  }

  form.name = profile.value.name
  form.email = profile.value.email
  form.graduationYear = profile.value.graduationYear
  form.biography = profile.value.biography
  form.projects = copyProjects(profile.value.projects)

  selectedFile.value = null
  imagePreview.value = ''
  isEditing.value = true
}

function cancelEditing() {
  selectedFile.value = null
  imagePreview.value = ''
  isEditing.value = false
}

function addProject() {
  form.projects.push({
    name: '',
    contribution: '',
    featured: form.projects.length === 0,
  })
}

function removeProject(index: number) {
  form.projects.splice(index, 1)
}

function makeFeatured(selectedIndex: number) {
  form.projects.forEach((project, index) => {
    project.featured = index === selectedIndex
  })
}

function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    toast.add({
      title: 'Invalid file',
      description: 'Please select a JPEG, PNG, or WebP image.',
      color: 'error',
    })

    return
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.add({
      title: 'Image is too large',
      description: 'The image must be smaller than 5 MB.',
      color: 'error',
    })

    return
  }

  selectedFile.value = file

  const reader = new FileReader()

  reader.onload = (loadEvent) => {
    if (selectedFile.value !== file || !isEditing.value) return
    imagePreview.value =
      loadEvent.target?.result as string
  }

  reader.readAsDataURL(file)
}

async function uploadProfilePicture() {
  if (!selectedFile.value) {
    return profile.value?.imageUrl || null
  }

  const formData = new FormData()
  formData.append('file', selectedFile.value)

  const response = await $fetch<{ imageUrl: string }>(
    '/api/users/upload',
    {
      method: 'POST',
      body: formData,
    },
  )

  return response.imageUrl
}

async function saveProfile() {
  if (!profile.value) {
    return
  }

  if (isSaving.value) return
  const parsed = profileUpdateSchema.safeParse({
    name: form.name,
    graduationYear: form.graduationYear,
    biography: form.biography,
  })
  if (!parsed.success) {
    toast.add({
      title: 'Check your profile',
      description: parsed.error.issues[0]?.message || 'Please check the profile fields.',
      color: 'error',
    })
    return
  }

  isSaving.value = true
  let textSaved = false

  try {
    const updatedProfile = await $fetch<ProfileResponse>('/api/profile', {
      method: 'PUT',
      body: parsed.data,
    })
    profile.value = { ...profile.value, ...updatedProfile }
    textSaved = true

    // Text and avatar use separate endpoints. Report partial success explicitly.
    if (selectedFile.value) {
      profile.value.imageUrl = await uploadProfilePicture()
    }

    selectedFile.value = null
    imagePreview.value = ''
    isEditing.value = false

    toast.add({
      title: 'Profile saved',
      description: 'Your profile was updated successfully.',
      color: 'success',
    })
  } catch {
    toast.add({
      title: textSaved ? 'Profile saved, image upload failed' : 'Unable to save profile',
      description: textSaved
        ? 'Your text changes were saved. Please retry the image upload.'
        : 'Your changes were not saved. Please try again.',
      color: 'error',
    })
  } finally {
    isSaving.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <main class="profile-page">
    <UContainer class="max-w-6xl py-8">
      <nav class="mb-6 flex items-center justify-between">
        <NuxtLink to="/" class="epics-logo">
          <span class="logo-orange">E</span>
          <span class="logo-yellow">P</span>
          <span class="logo-green">I</span>
          <span class="logo-teal">C</span>
          <span class="logo-blue">S</span>
        </NuxtLink>

        <UButton
          color="error"
          variant="soft"
          label="Logout"
          @click="logout"
        />
      </nav>

      <div
        v-if="pending"
        class="rounded-3xl bg-[#f8f8f4] p-12"
      >
        <div class="flex items-center gap-8">
          <USkeleton class="h-36 w-36 rounded-full" />

          <div class="w-full space-y-4">
            <USkeleton class="h-10 w-64" />
            <USkeleton class="h-6 w-40" />
            <USkeleton class="h-5 w-full" />
          </div>
        </div>
      </div>

      <UAlert
        v-else-if="errorMessage"
        color="error"
        variant="subtle"
        title="Unable to load profile"
        :description="errorMessage"
      />

      <article
        v-else-if="profile"
        class="profile-card"
      >
        <header class="profile-header">
          <div class="identity-section">
            <div class="profile-avatar">
              <img
                v-if="displayedImage"
                :src="displayedImage"
                :alt="`${profile.name}'s profile picture`"
              />

              <span v-else>
                {{ profileInitials }}
              </span>
            </div>

            <div v-if="!isEditing">
              <p class="eyebrow">
                EPICS alumni profile
              </p>

              <h1>{{ profile.name }}</h1>

              <p class="class-year">
                {{
                  profile.graduationYear
                    ? `Class of ${profile.graduationYear}`
                    : 'Graduation year not provided'
                }}
              </p>
            </div>

            <div v-else class="identity-form">
              <label class="field-label">
                Full name

                <UInput
                  v-model="form.name"
                  placeholder="Enter your full name"
                  size="xl"
                  class="w-full"
                />
              </label>

              <label class="field-label">
                Graduation year

                <UInput
                  v-model="form.graduationYear"
                  placeholder="For example: 2026"
                  size="xl"
                  class="w-full"
                />
              </label>
            </div>
          </div>

          <div
            v-if="!isEditing"
            class="header-actions"
          >
            <a
              :href="contactLink"
              class="contact-button"
            >
              Contact
            </a>

            <button
              type="button"
              class="edit-button"
              @click="startEditing"
            >
              Edit profile
            </button>
          </div>
        </header>

        <section
          v-if="isEditing"
          class="edit-section"
        >
          <label class="field-label">
            Email address

            <UInput
              v-model="form.email"
              readonly
              type="email"
              placeholder="name@example.com"
              size="xl"
              class="w-full"
            />
          </label>

          <label class="field-label">
            Biography

            <UTextarea
              v-model="form.biography"
              placeholder="Tell other EPICS members about yourself"
              :rows="5"
              class="w-full"
            />
          </label>

          <div>
            <p class="field-label mb-2">
              Profile picture
            </p>

            <label class="file-selector">
              <span>Choose an image</span>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                :disabled="isSaving"
                @change="handleImageUpload"
              />
            </label>

            <p
              v-if="selectedFile"
              class="mt-2 text-sm text-gray-600"
            >
              Selected: {{ selectedFile.name }}
            </p>
          </div>

          <section class="project-editor">
            <p class="text-gray-500">Project editing is not available yet.</p>
            <div class="section-heading">
              <h2>Projects</h2>

              <UButton
                color="success"
                variant="soft"
                disabled
                @click="addProject"
              >
                Add project
              </UButton>
            </div>

            <div
              v-if="form.projects.length"
              class="project-form-list"
            >
              <article
                v-for="(project, index) in form.projects"
                :key="project.id || index"
                class="project-form"
              >
                <div class="flex justify-between">
                  <strong>Project {{ index + 1 }}</strong>

                  <button
                    type="button"
                    class="font-semibold text-red-600"
                    disabled
                    @click="removeProject(index)"
                  >
                    Remove
                  </button>
                </div>

                <label class="field-label">
                  Project name

                  <UInput
                    v-model="project.name"
                    disabled
                    placeholder="Enter the project name"
                    class="w-full"
                  />
                </label>

                <label class="field-label">
                  Contribution

                  <UTextarea
                    v-model="project.contribution"
                    disabled
                    placeholder="Describe your contribution"
                    :rows="3"
                    class="w-full"
                  />
                </label>

                <label class="featured-option">
                  <input
                    type="radio"
                    name="featured-project"
                    disabled
                    :checked="project.featured"
                    @change="makeFeatured(index)"
                  />

                  Featured project
                </label>
              </article>
            </div>

            <p v-else class="text-gray-500">
              No projects have been added.
            </p>
          </section>

          <div class="edit-actions">
            <UButton
              color="neutral"
              variant="soft"
              :disabled="isSaving"
              @click="cancelEditing"
            >
              Cancel
            </UButton>

            <UButton
              color="success"
              :loading="isSaving"
              @click="saveProfile"
            >
              Save profile
            </UButton>
          </div>
        </section>

        <template v-else>
          <section class="profile-information">
            <!-- Roles are not assigned by this profile API. -->
            <div
              v-if="profile.roles.length"
              class="role-list"
            >
              <span
                v-for="role in profile.roles"
                :key="role"
                class="role-badge"
                :class="roleClasses[role]"
              >
                {{ role }}
              </span>
            </div>

            <p v-else class="text-gray-500">
              No roles have been assigned.
            </p>

            <p class="biography">
              {{
                profile.biography ||
                'Select “Edit profile” to add information about yourself.'
              }}
            </p>
          </section>

          <section class="projects-section">
            <p class="eyebrow">
              Work and contributions
            </p>

            <h2>Projects</h2>

            <div
              v-if="profile.projects.length"
              class="project-grid"
            >
              <article
                v-for="project in profile.projects"
                :key="project.id || project.name"
                class="project-card"
                :class="{
                  'featured-project': project.featured,
                }"
              >
                <span class="project-type">
                  {{
                    project.featured
                      ? 'Featured project'
                      : 'Project'
                  }}
                </span>

                <h3>{{ project.name }}</h3>

                <p>{{ project.contribution }}</p>
              </article>
            </div>

            <p v-else class="text-gray-500">
              No projects have been added.
            </p>
          </section>
        </template>
      </article>
    </UContainer>
  </main>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 12% 14%,
      rgb(255 255 255 / 7%) 0 2px,
      transparent 3px
    ) 0 0 / 38px 38px,
    linear-gradient(145deg, #0b382b, #124f3d);
  font-family: "Avenir Next", Avenir, sans-serif;
}

.epics-logo {
  font-family: Georgia, serif;
  font-size: 2.4rem;
  font-weight: 900;
  letter-spacing: -0.12em;
  text-decoration: none;
}

.logo-orange {
  color: #ee8c2d;
}

.logo-yellow {
  color: #e5b62f;
}

.logo-green {
  color: #76a744;
}

.logo-teal {
  color: #2f9c83;
}

.logo-blue {
  color: #287aad;
}

.profile-card {
  overflow: hidden;
  border-radius: 30px;
  background: #f8f8f4;
  box-shadow: 0 30px 80px rgb(0 0 0 / 24%);
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  padding: 56px 64px 36px;
}

.identity-section {
  display: flex;
  align-items: center;
  gap: 38px;
}

.profile-avatar {
  display: grid;
  width: 176px;
  height: 176px;
  flex-shrink: 0;
  place-items: center;
  overflow: hidden;
  border: 5px solid white;
  border-radius: 50%;
  background: #e9eeeb;
  color: #124f3d;
  font-family: Georgia, serif;
  font-size: 3.5rem;
  font-weight: 700;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.eyebrow {
  margin: 0 0 8px;
  color: #bd531f;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.profile-header h1 {
  margin: 0;
  color: #12251f;
  font-family: Georgia, serif;
  font-size: clamp(2.6rem, 5vw, 4.4rem);
  line-height: 1;
}

.class-year {
  margin: 14px 0 0;
  color: #78837f;
  font-size: 1.4rem;
}

.identity-form {
  display: grid;
  min-width: 330px;
  gap: 18px;
}

.header-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-button,
.edit-button {
  display: inline-flex;
  min-width: 165px;
  justify-content: center;
  padding: 14px 24px;
  border: 0;
  border-radius: 14px;
  cursor: pointer;
  font: inherit;
  font-weight: 750;
  text-decoration: none;
}

.contact-button {
  background: #ec7100;
  color: white;
}

.edit-button {
  background: #e2e9e5;
  color: #124f3d;
}

.profile-information,
.edit-section {
  padding: 0 64px 45px;
}

.edit-section {
  display: grid;
  gap: 28px;
}

.field-label {
  display: grid;
  gap: 8px;
  color: #12251f;
  font-size: 0.9rem;
  font-weight: 750;
}

.file-selector {
  display: flex;
  min-height: 90px;
  align-items: center;
  justify-content: center;
  border: 2px dashed #95a69f;
  border-radius: 14px;
  background: #f0f3f1;
  color: #124f3d;
  cursor: pointer;
  font-weight: 750;
}

.file-selector input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.role-list {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 28px;
}

.role-badge {
  min-width: 110px;
  padding: 9px 20px;
  border-radius: 999px;
  font-weight: 800;
  text-align: center;
}

.role-alum {
  background: #fbd1aa;
  color: #c85a00;
}

.role-admin {
  background: #ffc0c4;
  color: #c9000a;
}

.role-mentor {
  background: #acd8f1;
  color: #2753b8;
}

.role-student {
  background: #b8dc82;
  color: #087b53;
}

.biography {
  max-width: 900px;
  margin: 0;
  color: #253732;
  font-size: 1.2rem;
  line-height: 1.7;
}

.projects-section,
.project-editor {
  margin: 0 34px 34px;
  padding: 38px;
  border-radius: 24px;
  background: #edf0ed;
}

.project-editor {
  margin: 0;
}

.projects-section h2,
.project-editor h2 {
  margin: 0;
  color: #12251f;
  font-family: Georgia, serif;
  font-size: 2rem;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 24px;
}

.project-card,
.project-form {
  padding: 26px;
  border: 1px solid #d9dedb;
  border-radius: 18px;
  background: white;
}

.featured-project {
  border-color: #efb080;
  box-shadow: inset 4px 0 0 #ec7100;
}

.project-type {
  display: inline-block;
  margin-bottom: 12px;
  color: #bd531f;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.project-card h3 {
  margin: 0 0 12px;
  color: #172b24;
}

.project-card p {
  margin: 0;
  color: #596560;
  line-height: 1.6;
}

.project-form-list {
  display: grid;
  gap: 18px;
}

.project-form {
  display: grid;
  gap: 18px;
}

.featured-option {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #253732;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 760px) {
  .profile-header {
    padding: 38px 26px 28px;
  }

  .profile-avatar {
    width: 110px;
    height: 110px;
    font-size: 2.3rem;
  }

  .profile-information,
  .edit-section {
    padding-right: 26px;
    padding-left: 26px;
  }

  .projects-section {
    margin: 0 16px 16px;
    padding: 26px;
  }

  .project-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .profile-header,
  .identity-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .identity-form,
  .header-actions,
  .contact-button,
  .edit-button {
    width: 100%;
    min-width: 0;
  }
}
</style>
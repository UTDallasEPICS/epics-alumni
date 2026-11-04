<script setup lang="ts">
import { alumniIdSchema, type AlumniDirectoryEntry } from '#shared/alumni'
import { isProfessionalUrl } from '#shared/profile'

const route = useRoute()
const request = useRequestFetch()
const { data, status, error, refresh } = await useAsyncData('alumni-detail', () => {
  const id = alumniIdSchema.safeParse(route.params.id)
  if (!id.success) throw createError({ statusCode: 404, statusMessage: 'Profile unavailable' })
  return request<AlumniDirectoryEntry>(`/api/alumni/${encodeURIComponent(id.data)}`)
}, { watch: [() => route.params.id] })
watch(error, (value) => {
  if (value?.statusCode === 401) void navigateTo('/auth', { replace: true })
}, { immediate: true })
const links = computed(() => {
  const profile = data.value
  if (!profile) return []
  return ([['linkedinUrl', 'LinkedIn'], ['githubUrl', 'GitHub'], ['websiteUrl', 'Website']] as const)
    .filter(([field]) => profile[field] && isProfessionalUrl(profile[field], field))
    .map(([field, label]) => ({ label, href: profile[field]! }))
})
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <NuxtLink to="/people" class="underline">Back to alumni directory</NuxtLink>
    <p v-if="status === 'pending'" role="status">Loading profile…</p>
    <section v-else-if="error" role="alert">
      <h1 class="text-2xl font-semibold">{{ error.statusCode === 404 ? 'Profile unavailable' : 'Unable to load profile' }}</h1>
      <p>{{ error.statusCode === 404 ? 'This profile is not available in the directory.' : 'Please try again.' }}</p>
      <UButton v-if="error.statusCode !== 404" class="mt-3" @click="refresh()">Retry profile</UButton>
    </section>
    <article v-else-if="data" class="rounded border p-6 space-y-4">
      <img v-if="data.imageUrl" :src="data.imageUrl" :alt="data.name" class="h-24 w-24 rounded-full object-cover" />
      <h1 class="text-3xl font-semibold">{{ data.name }}</h1>
      <p v-if="data.graduationYear">Class of {{ data.graduationYear }}</p>
      <dl class="grid gap-4 sm:grid-cols-3">
        <div v-if="data.major"><dt>Major</dt><dd>{{ data.major }}</dd></div>
        <div v-if="data.company"><dt>Company</dt><dd>{{ data.company }}</dd></div>
        <div v-if="data.jobTitle"><dt>Job title</dt><dd>{{ data.jobTitle }}</dd></div>
      </dl>
      <p v-if="data.biography" class="whitespace-pre-wrap">{{ data.biography }}</p>
      <div class="flex flex-wrap gap-4">
        <a v-for="link in links" :key="link.label" :href="link.href" target="_blank" rel="noopener noreferrer" class="underline">{{ link.label }}</a>
      </div>
    </article>
  </UContainer>
</template>

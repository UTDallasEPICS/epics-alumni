<script setup lang="ts">
import { alumniQuerySchema, type AlumniDirectoryResponse } from '#shared/alumni'

const route = useRoute()
const request = useRequestFetch()
const query = computed(() => alumniQuerySchema.safeParse(route.query))
const form = reactive({ q: '', graduationYear: '', major: '', company: '', jobTitle: '', sort: 'name_asc', limit: '20' })
const validationError = ref('')
watch(() => route.query, () => {
  const values = query.value.success ? query.value.data : alumniQuerySchema.parse({})
  Object.assign(form, { q: values.q, graduationYear: values.graduationYear ?? '', major: values.major ?? '', company: values.company ?? '', jobTitle: values.jobTitle ?? '', sort: values.sort, limit: String(values.limit) })
  validationError.value = ''
}, { immediate: true })

const { data, status, error, refresh } = await useAsyncData('alumni-directory', () => {
  if (!query.value.success) throw createError({ statusCode: 400, statusMessage: 'Check the directory filters in the address.' })
  return request<AlumniDirectoryResponse>('/api/alumni', { query: query.value.data })
}, { watch: [() => route.fullPath] })
watch(error, (value) => {
  if (value?.statusCode === 401) void navigateTo('/auth', { replace: true })
}, { immediate: true })

async function applyFilters() {
  const values = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''))
  const parsed = alumniQuerySchema.safeParse(values)
  if (!parsed.success) {
    validationError.value = 'Use a four-digit graduation year from 1900 to 2100 and check your filters.'
    return
  }
  validationError.value = ''
  await navigateTo({ path: '/people', query: { ...values, page: '1' } })
}
async function changePage(page: number) {
  if (!query.value.success || status.value === 'pending') return
  await navigateTo({ path: '/people', query: { ...route.query, page: String(page) } })
}
</script>

<template>
  <UContainer class="py-8 space-y-6">
    <header>
      <h1 class="text-3xl font-semibold">Alumni directory</h1>
      <p class="mt-2 text-gray-600">Find alumni who have chosen to share their profiles.</p>
    </header>
    <form class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" @submit.prevent="applyFilters">
      <label class="grid gap-1">Name <UInput v-model="form.q" name="q" :maxlength="100" placeholder="Search by name" /></label>
      <label class="grid gap-1">Graduation year <UInput v-model="form.graduationYear" name="graduationYear" placeholder="2026" :maxlength="4" /></label>
      <label class="grid gap-1">Major <UInput v-model="form.major" name="major" :maxlength="120" /></label>
      <label class="grid gap-1">Company <UInput v-model="form.company" name="company" :maxlength="120" /></label>
      <label class="grid gap-1">Job title <UInput v-model="form.jobTitle" name="jobTitle" :maxlength="120" /></label>
      <label class="grid gap-1">Sort
        <select v-model="form.sort" name="sort" class="rounded border p-2">
          <option value="name_asc">Name: A to Z</option><option value="name_desc">Name: Z to A</option>
          <option value="graduation_year_asc">Graduation: oldest first</option><option value="graduation_year_desc">Graduation: newest first</option>
        </select>
      </label>
      <label class="grid gap-1">Results per page
        <select v-model="form.limit" name="limit" class="rounded border p-2"><option>10</option><option>20</option><option>50</option></select>
      </label>
      <div class="flex items-end gap-3">
        <UButton type="submit" :disabled="status === 'pending'">Search alumni</UButton>
        <NuxtLink to="/people" class="underline">Clear filters</NuxtLink>
      </div>
    </form>
    <p v-if="validationError" role="alert">{{ validationError }}</p>
    <section :aria-busy="status === 'pending'" aria-live="polite">
      <p v-if="status === 'pending'" role="status">Loading alumni…</p>
      <div v-else-if="error" role="alert">
        <p>{{ error.statusCode === 400 ? 'The directory filters are invalid. Clear them and try again.' : 'Unable to load alumni. Please try again.' }}</p>
        <UButton class="mt-3" @click="refresh()">Retry directory</UButton>
      </div>
      <template v-else-if="data">
        <p v-if="!data.data.length" class="rounded border p-6">No published profiles match these filters. Alumni appear here only after choosing to share a completed profile.</p>
        <ul v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="alumnus in data.data" :key="alumnus.id" class="rounded border p-5">
            <img v-if="alumnus.imageUrl" :src="alumnus.imageUrl" :alt="alumnus.name" class="mb-3 h-16 w-16 rounded-full object-cover" />
            <h2 class="text-xl font-semibold"><NuxtLink :to="`/people/${encodeURIComponent(alumnus.id)}`" class="underline">{{ alumnus.name }}</NuxtLink></h2>
            <p v-if="alumnus.graduationYear">Class of {{ alumnus.graduationYear }}</p>
            <p v-if="alumnus.major">{{ alumnus.major }}</p>
            <p v-if="alumnus.jobTitle || alumnus.company">{{ [alumnus.jobTitle, alumnus.company].filter(Boolean).join(' · ') }}</p>
          </li>
        </ul>
        <nav v-if="data.pagination.total > 0" aria-label="Directory pages" class="mt-6 flex flex-wrap items-center gap-4">
          <UButton :disabled="!data.pagination.hasPreviousPage" @click="changePage(data.pagination.page - 1)">Previous</UButton>
          <span>Page {{ data.pagination.page }} of {{ data.pagination.totalPages }} · {{ data.pagination.total }} results</span>
          <UButton :disabled="!data.pagination.hasNextPage" @click="changePage(data.pagination.page + 1)">Next</UButton>
        </nav>
      </template>
    </section>
  </UContainer>
</template>

<script setup lang="ts">
  import type { DropdownMenuItem } from '@nuxt/ui'

  interface Project {
    id: string
    projectTitle: string
    semester: string
    projectCategory: string
    status: string
    description: string
  }

  // Fetch project data from the backend API.
  const { data: projects, status: fetchStatus, error } = await useFetch<Project[]>('/api/projects')

  // Shared search state used by the navbar.
  const route = useRoute()
  const { searchQuery } = useProjectSearch()

  // Initialize the search from the URL query parameter.
  searchQuery.value = typeof route.query.search === 'string' ? route.query.search : ''

  // Keep the search input synchronized when the URL changes.
  watch(
    () => route.query.search,
    (value) => {
      searchQuery.value = typeof value === 'string' ? value : ''
    }
  )

  // Filter projects by title, category, description, semester, or status.
  const searchedProjects = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    const allProjects = projects.value ?? []

    if (!query) {
      return allProjects
    }

    return allProjects.filter((project) =>
      [
        project.projectTitle,
        project.projectCategory,
        project.description,
        project.semester,
        project.status,
      ].some((field) => field.toLowerCase().includes(query))
    )
  })

  // Track selected semester in dropdown.
  const selectedSemester = ref('All Semesters')

  // Build dropdown options from semesters returned by API.
  const semesters = computed(() => [
    'All Semesters',
    ...new Set((projects.value ?? []).map((project) => project.semester)),
  ])

  const items = computed<DropdownMenuItem[]>(() =>
    semesters.value.map((semester) => ({
      label: semester,
      onSelect: () => {
        selectedSemester.value = semester
      },
    }))
  )

  // Apply both search and semester filters.
  const filteredProjects = computed(() => {
    if (selectedSemester.value === 'All Semesters') {
      return searchedProjects.value
    }

    return searchedProjects.value.filter((project) => project.semester === selectedSemester.value)
  })

  // Track project details modal.
  const open = ref(false)
  const selected = ref<Project | null>(null)

  // Open modal when project card is clicked.
  function openProject(project: Project) {
    selected.value = project
    open.value = true
  }
</script>

<template>
  <div class="px-8 py-7 md:px-40">
    <h1 class="mb-2 text-2xl font-bold">Projects</h1>

    <p class="mb-6 text-gray-500">Explore projects completed by EPICS student teams.</p>

    <!-- Filter projects by semester. -->
    <div class="mb-6 flex items-center gap-3">
      <span class="font-medium">Select Term:</span>

      <UDropdownMenu :items="items" :content="{ align: 'start' }" :ui="{ content: 'w-48' }">
        <UButton
          :label="selectedSemester"
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-chevron-down"
        />
      </UDropdownMenu>
    </div>

    <!-- Loading state. -->
    <p v-if="fetchStatus === 'pending'">Loading projects...</p>

    <!-- API error state. -->
    <p v-else-if="error" class="text-red-500">Unable to load projects. Please try again.</p>

    <!-- Empty search/filter state. -->
    <p v-else-if="filteredProjects.length === 0">
      No projects found<span v-if="searchQuery.trim()"> matching "{{ searchQuery.trim() }}"</span
      ><span v-if="selectedSemester !== 'All Semesters'"> for {{ selectedSemester }}</span
      >.
    </p>

    <template v-else>
      <!-- Number of matching projects. -->
      <p class="mb-4 text-sm text-gray-500">{{ filteredProjects.length }} projects</p>

      <!-- Project cards. -->
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="project in filteredProjects"
          :key="project.id"
          class="hover:ring-primary cursor-pointer transition hover:bg-[#D9D9D9] hover:ring-3"
          @click="openProject(project)"
        >
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <UBadge color="neutral" variant="subtle">
              {{ project.semester }}
            </UBadge>

            <UBadge color="primary" variant="subtle">
              {{ project.status }}
            </UBadge>
          </div>

          <h2 class="mb-2 text-lg font-semibold">
            {{ project.projectTitle }}
          </h2>

          <p class="mb-3 text-sm text-gray-500">
            {{ project.projectCategory }}
          </p>

          <p class="text-sm leading-6">
            {{ project.description }}
          </p>
        </UCard>
      </div>
    </template>

    <!-- Project details modal. -->
    <UModal
      v-model:open="open"
      :title="selected?.projectTitle"
      :description="
        selected
          ? `${selected.projectCategory} - ${selected.semester} - ${selected.status}`
          : undefined
      "
    >
      <template #body>
        <div v-if="selected" class="space-y-4">
          <div>
            <h3 class="mb-1 text-base font-semibold">Description:</h3>

            <p class="text-base leading-6">
              {{ selected.description }}
            </p>
          </div>

          <div>
            <h4 class="mb-1 text-base font-semibold">Student contributors:</h4>

            <!-- Replace these placeholders with actual contributors when available. -->
            <ul class="list-disc pl-5">
              <li>First student</li>
              <li>Second student</li>
              <li>Third student</li>
              <li>Fourth student</li>
              <li>Fifth student</li>
              <li>Sixth student</li>
            </ul>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

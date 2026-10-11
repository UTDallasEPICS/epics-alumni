<script setup lang="ts">
  import type { DropdownMenuItem } from '@nuxt/ui'

  // Defines structure of project returned by API.
  interface Project {
    id: string
    projectTitle: string
    semester: string
    projectCategory: string
    status: string
    description: string
  }

  // Fetches project data from backend API.
  const { data: projects, status: fetchStatus, error } = await useFetch<Project[]>('/api/projects')

  // Tracks semester selected in dropdown.
  const selectedSemester = ref('All Semesters')

  // dropdown options from semesters available in database, not hardcoded.
  const semesters = computed(() => [
    'All Semesters',
    ...new Set((projects.value ?? []).map((project) => project.semester)),
  ])

  // dropdown menu item for each semester.
  const items = computed<DropdownMenuItem[]>(() =>
    semesters.value.map((semester) => ({
      label: semester,
      onSelect: () => {
        selectedSemester.value = semester
      },
    }))
  )

  // Filters projects based on selected semester.
  // Selecting "All Semesters" displays all 100 projects.
  const filteredProjects = computed(() => {
    if (selectedSemester.value === 'All Semesters') {
      return projects.value ?? []
    }

    return (projects.value ?? []).filter((project) => project.semester === selectedSemester.value)
  })
</script>

<template>
  <div class="px-8 py-7 md:px-40">
    <h1 class="mb-2 text-2xl font-bold">Projects</h1>
    <p class="mb-6 text-gray-500">Explore projects completed by EPICS student teams.</p>

    <!-- Lets users filter project list by semester. -->
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

    <!-- Displays loading message while API request is pending. -->
    <p v-if="fetchStatus === 'pending'">Loading projects...</p>

    <!-- accounts for edge case that displays error message if API request fails. -->
    <p v-else-if="error" class="text-red-500">Unable to load projects. Please try again.</p>

    <!-- edge case that handles cases where selected semester has no projects. -->
    <p v-else-if="filteredProjects.length === 0">No projects found for this semester.</p>

    <template v-else>
      <!-- Shows # of projects matching current filter. -->
      <p class="mb-4 text-sm text-gray-500">{{ filteredProjects.length }} projects</p>

      <!-- Displays filtered projects in card grid. -->
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <UCard v-for="project in filteredProjects" :key="project.id">
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
  </div>
</template>
```

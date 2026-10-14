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

// Tracks if the modal is open
const open = ref(false)
// Holds the project that was selected and null when nothing selected
const selected = ref<Project | null>(null)
// When a project is clicked it will open the modal with the project's info
function openProject(project: Project){
  selected.value=project
  open.value = true
}
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
        <UCard v-for="project in filteredProjects" :key="project.id" class="cursor-pointer transition hover:ring-3 hover:ring-primary hover:bg-[#D9D9D9]" @click="openProject(project)">
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
    <!-- makes an overlay with slightly more project details(students on the project.which is hardcoded for now). -->
    <UModal
      v-model:open="open"
      :title="selected?.projectTitle"
      :description="`${selected?.projectCategory} - ${selected?.semester} - ${selected?.status}`"
    >
      <template #body>
        <div v-if="selected" class="space-y-4">
          <h3 class="mb-1 text-base font-semibold">
            Description:
          </h3>

          <p class="text-base leading-6">
            {{ selected.description }}
          </p>

          <h4 class="mb-1 text-base font-semibold">
            Student contributors:
          </h4>
          <!-- bulleted list of students. -->
          <ul class="list-disc pl-5">
            <li>First student</li>
            <li>Second student</li>
            <li>Third student</li>
            <li>Fourth student</li>
            <li>Fifth student</li>
            <li>Sixth student</li>
          </ul>
        </div>
      </template>
    </UModal>
  </div>
</template>
```

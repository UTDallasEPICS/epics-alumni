<script setup lang="ts">
  import type { DropdownMenuItem } from "@nuxt/ui"
  import { useInfiniteScroll } from '@vueuse/core'


  interface Project {
    id: string
    projectTitle: string
    semester: string
    projectCategory: string
    status: string
    description: string
  }
  // For pagination of pages
  const pageSize = 15
  const hasMore = ref(true)
  const skip = ref(0)
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
  // Track selected semester in dropdown.
  const selectedSemester = ref('All Semesters')
  // Text from the search is trimmed for spaces and this is the value sent to the backend API
  const searchParam = computed(() => searchQuery.value.trim() || undefined)
  const semesterParam = computed(() => selectedSemester.value === 'All Semesters' ? undefined : selectedSemester.value,)

  // Fetch project data from the backend API.
  const { data, status, error } = await useLazyFetch<Project[]>('/api/projects', {key: 'projects-infinite-scroll', query: {skip, search: searchParam, semester: semesterParam}})

  const projects = ref<Project[]>([])

  // Appends new page
  watch(data, (page) => {
    if (!page) return
    projects.value = skip.value === 0 ? [...page] : [...projects.value, ...page]
    hasMore.value = page.length === pageSize
  },
  { immediate: true }
)
  // When search or semester changes return to page one so skips correct rows
  watch([searchParam, semesterParam], () => {
    skip.value = 0
    hasMore.value = true
  },
  { flush: 'sync' })

  // Trigger for the infinite scroll
  onMounted(() => {
    useInfiniteScroll(
      window,
      () => {
        skip.value += pageSize
      },
      {
        distance: 200,
        canLoadMore: () => hasMore.value && status.value !== 'pending',
      }
    )
  })

  // Options for the semester dropdown based on the list from the backend API
  const {data: semesterList} = await useFetch<string[]>('/api/projects/semester')
  const items = computed<DropdownMenuItem[]>(() =>
    ['All Semesters', ...(semesterList.value ?? [])].map((semester) => ({
      label: semester,
      onSelect: () => {
        selectedSemester.value = semester
      },
    }))
  )


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
    <p v-if="status === 'pending' && projects.length === 0">Loading projects...</p>

    <!-- API error state. -->
    <p v-else-if="error" class="text-red-500">Unable to load projects. Please try again.</p>

    <!-- Empty search/filter state. -->
    <p v-else-if="projects.length === 0">
      No projects found<span v-if="searchQuery.trim()"> matching "{{ searchQuery.trim() }}"</span
      ><span v-if="selectedSemester !== 'All Semesters'"> for {{ selectedSemester }}</span
      >.
    </p>

    <template v-else>
      <!-- Number of matching projects. -->
      <p class="mb-4 text-sm text-gray-500">{{ projects.length }} projects</p>      
      <!-- Project cards. -->
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <UCard
          v-for="project in projects"
          :key="project.id"
          class="hover:ring-primary cursor-pointer transition hover:bg-[#D9D9D9] hover:ring-3 dark:hover:bg-[#273543]"
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

          <h2 class="mb-2 text-lg font-semibold dark:text-gray-300">
            {{ project.projectTitle }}
          </h2>

          <p class="mb-3 text-sm text-gray-500">
            {{ project.projectCategory }}
          </p>

          <p class="text-sm leading-6 dark:text-gray-300">
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
            <h5 class="mb-1 text-base font-semibold">Mentor:</h5>

            <!-- Replace these placeholders with actual mentor when available. -->
            <ul class="list-disc pl-5">
              <li>Mentor Name</li>
            </ul>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

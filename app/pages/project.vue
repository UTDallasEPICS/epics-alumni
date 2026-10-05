<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const items = ref<DropdownMenuItem[]>([
  {
    label: 'Fall 2026'
  },
  {
    label: 'Summer 2026'
  },
  {
    label: 'Spring 2026'
  }
])
</script>

<template>
    <div class="pl-40 pt-7">
        <UDropdownMenu :items="items" :content="{ align: 'start' }" :ui="{ content: 'w-45' }">
            <UButton label="Select Term:" color="neutral" variant="outline" />
        </UDropdownMenu>
    </div>
</template>

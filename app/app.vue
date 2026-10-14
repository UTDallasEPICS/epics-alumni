<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-white text-gray-900">
      <AppNavbar v-if="route.path !== '/auth' && route.path !== '/auth/'" />

      <main>
        <NuxtPage />
      </main>
    </div>
  </UApp>
</template>
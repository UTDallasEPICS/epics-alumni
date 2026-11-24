<script setup lang="ts">
    import type { DropdownMenuItem } from "@nuxt/ui"
    //import { useInfiniteScroll } from '@vueuse/core'
    //drop down menu options
    const items = ref<DropdownMenuItem[][]>([
    [{
        label: "Alumni"
    },
    {
        label: "Student"
    }]
])
    //when clicked will go to the selected profile
//    function openProfile(id: string) {
//    navigateTo("/profile/${id}")
//    }

</script>

<template>
    <div class="min-h-screen bg-[#f3f2ef] px-8 py-7 md:px-40">
        <h1 class="mb-2 text-2xl font-bold">Profiles</h1>
        <div class="mb-6 flex items-center gap-3">
        <!-- Filter profile by type. -->
        <span class="font-medium">Select Profile Type:</span>

        <UDropdownMenu :items="items" :content="{ align: 'start' }" :ui="{ content: 'w-48' }">
            <UButton
            label="All Profiles"
            color="neutral"
            variant="outline"
            trailing-icon="i-lucide-chevron-down"
            />
        </UDropdownMenu>
    </div>
    <!-- Hardcoded preview of the profiles on the page. -->
    <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <!-- add the @click="openProfile" inside the UCard when profiles connected-->
        <UCard
            v-for="example in 15"
            :key="example"
            class="hover:ring-primary cursor-pointer transition hover:bg-[#D9D9D9] dark:hover:bg-[#273543] hover:ring-3"

            >
            <div class="flex flex-col items-center text-center">
                <UAvatar
                icon="i-lucide-user"
                class="mb-3 size-22"
                :ui="{ icon: 'size-12' }"
                />
                <h2 class="mb-2 text-lg font-semibold dark:text-gray-300">
                    Name
                </h2>
                <p class="text-sm leading-6 text-gray-500">
                    Graduation year
                </p>
                <p class="text-sm leading-6 text-gray-500">
                    Short description/Job position
                </p>
            </div>
        </UCard>
    </div>
    </div>
</template>
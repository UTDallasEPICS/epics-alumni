<script setup lang="ts">
  const route = useRoute()
  const { searchQuery } = useProjectSearch()

  // Navigate to the Projects page and apply the search.
  function submitSearch() {
    const query = searchQuery.value.trim()
  }
</script>

<template>
  <nav class="navbar">
    <!-- EPICS Logo -->
    <NuxtLink to="/" class="logo-link">
      <img src="/images/epics-logo.png" alt="EPICS logo" class="logo" />
    </NuxtLink>

    <!-- Functional Search -->
    <form class="search" @submit.prevent="submitSearch">
      <button type="submit" class="search-button" aria-label="Search">
        <span class="material-symbols-outlined search-icon">search</span>
      </button>

      <input v-model="searchQuery" type="search" placeholder="Search" aria-label="Search" />
    </form>

    <!-- Navigation Icons -->
    <div class="nav-icons">
      <!-- Home -->
      <UTooltip :content="{ align: 'center', side: 'bottom', sideOffset: 3 }" text="Home">
        <NuxtLink to="/" class="nav-link" :class="{ active: route.path === '/' }" aria-label="Home">
          <span class="material-symbols-outlined">home</span>
        </NuxtLink>
      </UTooltip>

      <!-- People -->
      <UTooltip :content="{ align: 'center', side: 'bottom', sideOffset: 3 }" text="People">
        <NuxtLink
          to="/people"
          class="nav-link"
          :class="{ active: route.path.startsWith('/people') }"
          aria-label="People"
        >
          <span class="material-symbols-outlined">group</span>
        </NuxtLink>
      </UTooltip>

      <!-- Projects -->
      <UTooltip :content="{ align: 'center', side: 'bottom', sideOffset: 3 }" text="Projects">
        <NuxtLink
          to="/projects"
          class="nav-link"
          :class="{ active: route.path.startsWith('/projects') }"
          aria-label="Projects"
        >
          <span class="material-symbols-outlined">folder</span>
        </NuxtLink>
      </UTooltip>

      <!-- Messages -->
      <UTooltip :content="{ align: 'center', side: 'bottom', sideOffset: 3 }" text="Messages">
        <NuxtLink
          to="/messages"
          class="nav-link"
          :class="{ active: route.path.startsWith('/messages') }"
          aria-label="Messages"
        >
          <span class="material-symbols-outlined">chat</span>
        </NuxtLink>
      </UTooltip>

      <!-- Notifs -->
      <UTooltip :content="{ align: 'center', side: 'bottom', sideOffset: 3 }" text="Notifications">
        <NuxtLink
          to="/notifications"
          class="nav-link"
          :class="{ active: route.path.startsWith('/notifications') }"
          aria-label="Notifications"
        >
          <span class="material-symbols-outlined">notifications</span>
        </NuxtLink>
      </UTooltip>

      <!-- Profile -->
      <UTooltip :content="{ align: 'center', side: 'bottom', sideOffset: 3 }" text="Profile">
        <NuxtLink
          to="/profile"
          class="nav-link"
          :class="{ active: route.path.startsWith('/profile') }"
          aria-label="Profile"
        >
          <span class="material-symbols-outlined">account_circle</span>
        </NuxtLink>
      </UTooltip>
    </div>
  </nav>
</template>

<style scoped>
  .navbar {
    position: sticky;
    top: 0;
    z-index: 50;

    width: 100%;
    height: 86px;
    background-color: #154734;

    display: flex;
    align-items: center;

    padding: 0 48px;
    box-sizing: border-box;
    gap: 28px;
  }

  /* Logo */
  .logo-link {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .logo {
    width: 100px;
    height: auto;
  }

  /* Search */
  .search {
    flex: 1;
    max-width: 650px;
    height: 48px;
    min-width: 0;

    display: flex;
    align-items: center;

    background-color: #38634f;
    border-radius: 24px;

    padding: 0 18px;
    box-sizing: border-box;
  }

  .search-button {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
  }

  .search .search-icon {
    color: #dfe9e4;
    font-size: 28px;
    line-height: 1;
  }

  .search input {
    width: 100%;
    min-width: 0;

    background: transparent;
    border: none;
    outline: none;

    color: white;

    margin-left: 10px;
    font-size: 16px;
  }

  .search input::placeholder {
    color: #dfe9e4;
  }

  .search input::-webkit-search-cancel-button {
    cursor: pointer;
  }

  /* Nav */
  .nav-icons {
    display: flex;
    align-items: center;
    gap: 22px;
    margin-left: auto;
    flex-shrink: 0;
  }

  .nav-link {
    display: flex;
    align-items: center;
    justify-content: center;

    color: #dfe9e4;
    text-decoration: none;

    transition:
      color 0.2s ease,
      transform 0.2s ease;
  }

  .nav-link:hover {
    color: white;
    transform: translateY(-1px);
  }

  /* active page color */
  .nav-link.active {
    color: #5fe0b7;
  }

  /* Google Material Symbols */
  .material-symbols-outlined {
    font-size: 32px;
    font-variation-settings:
      'FILL' 0,
      'wght' 400,
      'GRAD' 0,
      'opsz' 32;
  }

  /* Fill the active page's icon */
  .nav-link.active .material-symbols-outlined {
    font-variation-settings:
      'FILL' 1,
      'wght' 400,
      'GRAD' 0,
      'opsz' 32;
  }

  /* smaller screens like mobile */
  @media (max-width: 900px) {
    .navbar {
      padding: 0 20px;
      gap: 16px;
    }

    .logo {
      width: 80px;
    }

    .search {
      max-width: 350px;
    }

    .nav-icons {
      gap: 14px;
    }

    .material-symbols-outlined {
      font-size: 28px;
    }
  }

  @media (max-width: 600px) {
    .navbar {
      padding: 0 12px;
      gap: 12px;
    }

    .logo {
      width: 58px;
    }

    .search {
      height: 40px;
      padding: 0 10px;
    }

    .nav-icons {
      gap: 10px;
    }

    .material-symbols-outlined {
      font-size: 23px;
    }

    .search .search-icon {
      font-size: 23px;
    }

    .search input {
      font-size: 14px;
      margin-left: 6px;
    }
  }
</style>

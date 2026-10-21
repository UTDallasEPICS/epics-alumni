<script setup lang="ts">
  const route = useRoute()
</script>

<template>
  <nav class="navbar">
    <!-- EPICS Logo -->
    <NuxtLink to="/" class="logo-link">
      <img src="/images/epics-logo.png" alt="EPICS logo" class="logo" />
    </NuxtLink>

    <!-- Search -->
    <div class="search">
      <span class="material-symbols-outlined search-icon"> search </span>

      <input type="text" placeholder="Search" />
    </div>

    <!-- Navigation Icons -->
    <div class="nav-icons">
      <!-- Home -->
      <NuxtLink to="/" class="nav-link" :class="{ active: route.path === '/' }" aria-label="Home">
        <span class="material-symbols-outlined"> home </span>
      </NuxtLink>

      <!-- People -->
      <NuxtLink
        to="/people"
        class="nav-link"
        :class="{ active: route.path.startsWith('/people') }"
        aria-label="People"
      >
        <span class="material-symbols-outlined"> group </span>
      </NuxtLink>

      <!-- Projects -->
      <NuxtLink
        to="/projects"
        class="nav-link"
        :class="{ active: route.path.startsWith('/projects') }"
        aria-label="Projects"
      >
        <span class="material-symbols-outlined"> folder </span>
      </NuxtLink>

      <!-- Messages -->
      <NuxtLink
        to="/messages"
        class="nav-link"
        :class="{ active: route.path.startsWith('/messages') }"
        aria-label="Messages"
      >
        <span class="material-symbols-outlined"> chat </span>
      </NuxtLink>

      <!-- Notifications -->
      <NuxtLink
        to="/notifications"
        class="nav-link"
        :class="{ active: route.path.startsWith('/notifications') }"
        aria-label="Notifications"
      >
        <span class="material-symbols-outlined"> notifications </span>
      </NuxtLink>

      <!-- Profile -->
      <NuxtLink
        to="/profile"
        class="nav-link"
        :class="{ active: route.path.startsWith('/profile') }"
        aria-label="Profile"
      >
        <span class="material-symbols-outlined"> account_circle </span>
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
  .navbar {
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
  }

  .logo {
    width: 100px;
    height: auto;
    flex-shrink: 0;
  }

  /* Search */

  .search {
    flex: 1;
    max-width: 650px;
    height: 48px;

    display: flex;
    align-items: center;

    background-color: #38634f;
    border-radius: 24px;

    padding: 0 18px;
    box-sizing: border-box;
  }

  .search-icon {
    color: #dfe9e4;
    font-size: 28px;
  }

  .search input {
    width: 100%;

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

  /* Navigation */

  .nav-icons {
    display: flex;
    align-items: center;
    gap: 22px;

    margin-left: auto;
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

  /* Active page color */

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

  /* Fill active icon */

  .nav-link.active .material-symbols-outlined {
    font-variation-settings:
      'FILL' 1,
      'wght' 400,
      'GRAD' 0,
      'opsz' 32;
  }

  /* Smaller screens */

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
</style>

<script setup lang="ts">
  const route = useRoute()
  const search = ref('')
  async function searchAlumni() {
    await navigateTo({ path: '/people', query: { q: search.value.trim(), page: '1' } })
  }
</script>

<template>
  <nav class="navbar">
    <!-- EPICS Logo -->
    <NuxtLink to="/" class="logo-link">
      <img src="/images/epics-logo.png" alt="EPICS logo" class="logo" />
    </NuxtLink>

    <!-- Search -->
    <form class="search" role="search" @submit.prevent="searchAlumni">
      <button type="submit" class="search-icon" aria-label="Search alumni">⌕</button>

      <input v-model="search" type="search" placeholder="Search alumni" aria-label="Alumni name" maxlength="100" />
    </form>

    <!-- Navigation Icons -->
    <div class="nav-icons">
      <!-- Home -->
      <NuxtLink to="/" class="nav-link" :class="{ active: route.path === '/' }" aria-label="Home">
        <span class="icon home-icon"></span>
      </NuxtLink>

      <!-- People -->
      <NuxtLink
        to="/people"
        class="nav-link"
        :class="{ active: route.path.startsWith('/people') }"
        aria-label="People"
      >
        <span class="icon people-icon"></span>
      </NuxtLink>

      <!-- Projects -->
      <span class="nav-link opacity-50" aria-label="Projects" aria-disabled="true" title="Projects are not available yet">
        <span class="icon projects-icon"></span>
      </span>

      <!-- Messages -->
      <span class="nav-link opacity-50" aria-label="Messages" aria-disabled="true" title="Messages are not available yet">
        <span class="icon chat-icon"></span>
      </span>

      <!-- Notifications -->
      <span class="nav-link opacity-50" aria-label="Notifications" aria-disabled="true" title="Notifications are not available yet">
        <span class="icon notification-icon"></span>
      </span>

      <!-- Profile -->
      <NuxtLink
        to="/profile"
        class="nav-link"
        :class="{ active: route.path.startsWith('/profile') }"
        aria-label="Profile"
      >
        <span class="icon profile-icon"></span>
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

    transition: color 0.2s ease;
  }

  /* Active page color */

  .nav-link.active {
    color: #5fe0b7;
  }

  /* Icons */

  .icon {
    display: block;

    width: 32px;
    height: 32px;

    background-color: currentColor;

    mask-repeat: no-repeat;
    mask-position: center;
    mask-size: contain;

    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
    -webkit-mask-size: contain;
  }

  .home-icon {
    mask-image: url('/images/home-icon.svg');
    -webkit-mask-image: url('/images/home-icon.svg');
  }

  .people-icon {
    mask-image: url('/images/people-icon.svg');
    -webkit-mask-image: url('/images/people-icon.svg');
  }

  .projects-icon {
    mask-image: url('/images/projects-icon.svg');
    -webkit-mask-image: url('/images/projects-icon.svg');
  }

  .chat-icon {
    mask-image: url('/images/chat-icon.svg');
    -webkit-mask-image: url('/images/chat-icon.svg');
  }

  .notification-icon {
    mask-image: url('/images/notification-icon.svg');
    -webkit-mask-image: url('/images/notification-icon.svg');
  }

  .profile-icon {
    mask-image: url('/images/profile-icon.svg');
    -webkit-mask-image: url('/images/profile-icon.svg');
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

    .icon {
      width: 28px;
      height: 28px;
    }
  }
  @media (max-width: 640px) {
    .navbar { height: auto; min-height: 86px; flex-wrap: wrap; padding: 16px; gap: 16px; }
    .nav-icons { gap: 12px; }
    .icon { width: 24px; height: 24px; }
    .search { order: 3; flex-basis: 100%; max-width: none; }
  }
</style>

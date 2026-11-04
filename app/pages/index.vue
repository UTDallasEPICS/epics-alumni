<template>
  <div class="landing-page">
    <div class="page-container">
      <!-- Floating left menu -->
      <aside class="community-card">
        <h2>Community</h2>

        <NuxtLink to="/newsletters"> Past Newsletters </NuxtLink>

        <NuxtLink to="/project-partners"> Project Partners </NuxtLink>

        <NuxtLink to="/alumni-spotlights"> Alumni Spotlights </NuxtLink>
      </aside>

      <!-- Main feed -->
      <main class="feed">
        <!-- Project post -->
        <section class="feed-card">
          <div class="project-image">can add picture of their final board</div>

          <p class="project-description">
            Students post their end of semester poster board and provide details
          </p>
        </section>

        <!-- Newsletter -->
        <section class="feed-card newsletter-card">
          <h3>Most current newsletter</h3>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
  .landing-page {
    min-height: 100vh;
    background-color: #f3f2ef;
    padding: 32px 24px;
    box-sizing: border-box;
  }

  .page-container {
    width: 100%;
    max-width: 1200px;

    margin: 0 auto;

    display: grid;
    grid-template-columns: 220px minmax(0, 700px);
    gap: 24px;

    justify-content: center;
    align-items: start;
  }

  /* ---------------- LEFT COMMUNITY CARD ---------------- */

  .community-card {
    background-color: white;

    border: 1px solid #d6d6d6;
    border-radius: 12px;

    padding: 24px 18px;

    display: flex;
    flex-direction: column;
    gap: 22px;

    position: sticky;
    top: 100px;
  }

  .community-card h2 {
    margin: 0;

    color: #154734;

    font-size: 20px;
    font-weight: 700;
  }

  .community-card a {
    color: #333;

    text-decoration: none;

    font-size: 16px;
    font-weight: 600;
    line-height: 1.3;

    transition: color 0.2s ease;
  }

  .community-card a:hover {
    color: #e87500;
  }

  /* ---------------- MAIN FEED ---------------- */

  .feed {
    width: 100%;

    display: flex;
    flex-direction: column;

    gap: 24px;
  }

  .feed-card {
    width: 100%;

    background-color: white;

    border: 1px solid #d6d6d6;
    border-radius: 12px;

    padding: 32px;

    box-sizing: border-box;
  }

  /* ---------------- PROJECT POST ---------------- */

  .project-image {
    width: 100%;
    height: 260px;

    background-color: #d9d9d9;

    border-radius: 8px;

    display: flex;
    align-items: center;
    justify-content: center;

    text-align: center;

    font-size: 18px;

    margin-bottom: 24px;
  }

  .project-description {
    margin: 0;

    font-size: 18px;
    line-height: 1.5;

    color: #222;
  }

  /* ---------------- NEWSLETTER ---------------- */

  .newsletter-card {
    min-height: 180px;
  }

  .newsletter-card h3 {
    margin: 0;

    font-size: 20px;
    font-weight: 600;

    color: #222;
  }

  /* ---------------- RESPONSIVE ---------------- */

  @media (max-width: 900px) {
    .landing-page {
      padding: 20px;
    }

    .page-container {
      grid-template-columns: 180px minmax(0, 1fr);
      gap: 18px;
    }

    .community-card {
      padding: 20px 14px;
    }

    .feed-card {
      padding: 24px;
    }
  }

  @media (max-width: 700px) {
    .page-container {
      display: block;
    }

    .community-card {
      position: static;

      margin-bottom: 20px;

      flex-direction: row;
      flex-wrap: wrap;

      align-items: center;
    }

    .community-card h2 {
      width: 100%;
    }

    .feed-card {
      padding: 20px;
    }

    .project-image {
      height: 220px;
    }
  }
</style>

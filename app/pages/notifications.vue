<template>
  <div class="page">
    <header class="header">
      <h1>Epics</h1>
    </header>
    <main>
      <p class="heading">Notifications</p>
      <div class="stack">
        <div class="box"><p>Notifications go here</p></div>
        <div class="box"><p>Notifications go here</p></div>
        <div class="box"><p>Notifications go here</p></div>
        <div class="box"><p>Notifications go here</p></div>
      </div>
    </main>
  </div>
</template>

<style scoped>
  .page {
    background-color: white;
    color: black;
    min-height: 100vh;
  }
  .header {
    background-color: #154734;
    color: white;
    padding: 1rem 2rem;
  }
  .heading {
    font-family: Arial, sans-serif;
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
    position: relative;
    top: 10px;
    left: 250px;
  }
  .stack {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .box {
    border: 1px solid #000000;
    background-color: #f3f4f3;
    width: 1029px;
    height: 177px;
    top: 414px;
    left: 252px;
    padding: 1rem;
  }
</style>

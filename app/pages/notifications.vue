<template>
  <main>
    <p class="heading">Notifications</p>
    <div class="stack">
      <div class="box"><p>Notifications go here</p></div>
      <div class="box"><p>Notifications go here</p></div>
      <div class="box"><p>Notifications go here</p></div>
      <div class="box"><p>Notifications go here</p></div>
      <div class="box"><p>Notifications go here</p></div>
    </div>
  </main>
</template>

<style scoped>
  /* Specifying the positions in pixels is not a good idea, as it will not be responsive.
  Instead, use relative positioning or flexbox/grid to position elements. */
  /* Once you have a layout that works well, paste it to noti_tester.vue and then we can work on the notifications logic. */
  .heading {
    font-family: Arial, sans-serif;
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
    position: absolute;
    padding-top: 1%;
    left: 15%;
  }
  .stack {
    padding-top: 4%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .box {
    border: 0.01vw solid #000000;
    background-color: #f3f4f3;
    width: 70vw;
    height: 20vh;
    padding: 1rem;
  }
</style>

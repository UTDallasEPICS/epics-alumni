<script lang="ts" setup>
  const { data: notifications, refresh } = await useFetch('/api/notifications', {
    method: 'GET',
  })

  const open = ref(false)
  const notificationMessage = ref('')

  async function createNotification() {
    try {
      await $fetch('/api/notifications' as string, {
        method: 'POST',
        body: {
          createdBy: 'tester_user',
          message: notificationMessage.value,
          timestamp: new Date().toISOString(),
        },
      })
      await refresh() // reload the list so the new announcement appears
      open.value = false
    } catch (error) {
      console.error('Failed to save announcement', error)
    } finally {
      notificationMessage.value = ''
    }
  }

  async function deleteNotification(id: number | string) {
    await $fetch(`/api/notifications/${id}` as string, { method: 'DELETE' })
    await refresh() // remove the box from the list
  }
</script>

<template>
  <main>
    <p class="heading">Notifications</p>
    <button class="button" @click="open = true">Add Announcement</button>
    <div v-if="open" class="overlay" @click.self="open = false">
      <div class="modal-content">
        <h2>Add Announcement</h2>
        <input v-model="notificationMessage" placeholder="Enter announcement message" />
        <button @click="createNotification">Save</button>
        <button @click="open = false">Cancel</button>
      </div>
    </div>
    <div class="stack">
      <div v-for="notification in notifications" :key="notification.id" class="box">
        <button class="delete" @click="deleteNotification(notification.id)">Delete</button>
        <p>{{ notification.message }}</p>
      </div>
    </div>
  </main>
</template>

<style scoped>
  .button {
    font-family: Arial, sans-serif;
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
    position: relative;
    padding-top: 1%;
    left: 70%;
    margin-bottom: 1rem;
  }
  .modal-content {
    background: white;
    padding: 1.5rem;
    border-radius: 0.5rem;
    min-width: 20rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(6px);
    z-index: 50;
  }
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
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .box {
    position: relative;
    border: 0.01vw solid #000000;
    background-color: #f3f4f3;
    width: 70vw;
    height: 20vh;
    padding: 1rem;
  }
  .delete {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
  }
</style>

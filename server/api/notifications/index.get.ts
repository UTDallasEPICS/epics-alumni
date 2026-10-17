//Create API to get and display notifications for the user

// import { db } from '../../utils/db'
// import { user } from '../../db/schema'

export default defineEventHandler(async (event) => {
  console.log(event)
  return [{ id: 1, message: 'Notification 1', read: false }]
})

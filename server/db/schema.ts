import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { createSelectSchema, createInsertSchema } from 'drizzle-zod'
import { relations } from 'drizzle-orm'

// Setup tables and fill in information

// reminder to append these contents to existing schema.ts file

// profile table: one-to-one extension of Better Auth's `user` table.
// Holds all the EPICS-specific fields that don't belong on the auth table.
export const profile = sqliteTable('profile', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),

  profileType: text('profileType').notNull(), // 'student', 'alumni', 'mentor', 'admin'
  gradYear: integer('gradYear'),
  major: text('major'),
  currentCompany: text('currentCompany'),
  jobTitle: text('jobTitle'),
  city: text('city'),
  linkedinUrl: text('linkedinUrl'),
  githubUrl: text('githubUrl'),
  discordUsername: text('discordUsername'),

  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('profile_userId_idx').on(table.userId),
  index('profile_company_idx').on(table.currentCompany),
  index('profile_gradYear_idx').on(table.gradYear),
  index('profile_type_idx').on(table.profileType),
])

// project table: one row per EPICS project
// many to many relationship
export const project = sqliteTable('project', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  githubUrl: text('githubUrl'),
  description: text('description'),
  semester: text('semester'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

// userProject table: join/linking
// many users <-> many projects
export const userProject = sqliteTable('userProject', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  projectId: text('projectId').notNull().references(() => project.id, { onDelete: 'cascade' }),
  role: text('role'), // optional and if applicable, ex: "Team Lead"
}, (table) => [
  index('userProject_userId_idx').on(table.userId),
  index('userProject_projectId_idx').on(table.projectId),
])

// message table: direct messages between two users
export const message = sqliteTable('message', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  senderId: text('senderId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  receiverId: text('receiverId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isRead: integer('isRead', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('message_senderId_idx').on(table.senderId),
  index('message_receiverId_idx').on(table.receiverId),
])

// notification table: alerts tied to a user
// ex: "new message"
export const notification = sqliteTable('notification', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'message' | 'like' | 'comment'
  message: text('message').notNull(),
  referenceId: text('referenceId'), // id of message/post that triggered this
  isRead: integer('isRead', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('notification_userId_idx').on(table.userId),
])

// extra: social feed tables (post, like, comment)
// for the engaging social media functionality

// post table:
export const post = sqliteTable('post', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('post_userId_idx').on(table.userId),
])

// comment table:
export const comment = sqliteTable('comment', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  postId: text('postId').notNull().references(() => post.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('comment_postId_idx').on(table.postId),
])

// like table: junction table pattern
export const like = sqliteTable('like', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  postId: text('postId').notNull().references(() => post.id, { onDelete: 'cascade' }),
}, (table) => [
  index('like_userId_postId_idx').on(table.userId, table.postId), // enforce uniqueness at the app level, or add .unique() per Drizzle version
])

// Relations, also makes naming of foreign keys easier
// lets you do db.query.user.findFirst({ with: { profile: true, projects: true } }))
export const profileRelations = relations(profile, ({ one }) => ({
  user: one(user, { fields: [profile.userId], references: [user.id] }),
}))

export const projectRelations = relations(project, ({ many }) => ({
  members: many(userProject),
}))

export const userProjectRelations = relations(userProject, ({ one }) => ({
  user: one(user, { fields: [userProject.userId], references: [user.id] }),
  project: one(project, { fields: [userProject.projectId], references: [project.id] }),
}))

export const messageRelations = relations(message, ({ one }) => ({
  sender: one(user, { fields: [message.senderId], references: [user.id], relationName: 'sentMessages' }),
  receiver: one(user, { fields: [message.receiverId], references: [user.id], relationName: 'receivedMessages' }),
}))

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, { fields: [notification.userId], references: [user.id] }),
}))

export const postRelations = relations(post, ({ one, many }) => ({
  author: one(user, { fields: [post.userId], references: [user.id] }),
  comments: many(comment),
  likes: many(like),
}))

export const commentRelations = relations(comment, ({ one }) => ({
  author: one(user, { fields: [comment.userId], references: [user.id] }),
  post: one(post, { fields: [comment.postId], references: [post.id] }),
}))

export const likeRelations = relations(like, ({ one }) => ({
  user: one(user, { fields: [like.userId], references: [user.id] }),
  post: one(post, { fields: [like.postId], references: [post.id] }),
}))

// Zod schemas for validations
export const selectProfileSchema = createSelectSchema(profile)
export const insertProfileSchema = createInsertSchema(profile)
export const selectProjectSchema = createSelectSchema(project)
export const insertProjectSchema = createInsertSchema(project)
export const selectMessageSchema = createSelectSchema(message)
export const insertMessageSchema = createInsertSchema(message)
export const selectNotificationSchema = createSelectSchema(notification)
export const insertNotificationSchema = createInsertSchema(notification)
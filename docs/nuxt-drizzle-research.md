# Nuxt and Drizzle Research for the EPICS Alumni Tracker

**Project:** EPICS Alumni Tracker  
**Semester:** Fall 2026  
**Task:** Research Nuxt and Drizzle to understand how they can be used to implement the main features of the project.

---

## 1. Purpose of This Research

The goal of this research was to understand how Nuxt and Drizzle fit into our Alumni Tracker project and how we can use them when we start building the actual features.

Our project already uses a Nuxt starter template, Drizzle ORM, SQLite, Better Auth, Nuxt UI, and email OTP authentication. Because most of the team is still learning this stack, I focused on understanding what each tool is responsible for and how the pieces connect together.

The main features I kept in mind while researching were:

- user login with email OTP
- alumni/student profiles
- project pages
- searchable people and project directories
- profile types such as student, alumni, mentor, and admin
- contact links
- notifications
- possible messaging features later

---

# 2. What Nuxt Is Used For

Nuxt is the main web framework for the project.

It is built on Vue and gives us a structure for creating both the frontend pages and the server-side parts of the application.

For this project, Nuxt can handle things such as:

- the home page
- profile pages
- project pages
- search pages
- forms
- navigation
- API routes
- communication between the frontend and backend

One useful feature of Nuxt is file-based routing.

This means that instead of manually defining every route, Nuxt can automatically create routes based on files inside the `app/pages` folder.

For example:

```text
app/pages/people/index.vue
```

would become:

```text
/people
```

and something like:

```text
app/pages/projects/[id].vue
```

could be used for individual project pages.

This works well for our project because we will probably have separate pages for people, projects, profiles, notifications, and possibly admin tools.

---

# 3. Important Nuxt Folders

From the Nuxt documentation and the structure already in our repository, these are some of the most important folders for us.

## `app/`

This is where most of the frontend of the Alumni Tracker will be built.

Inside it, we can have things such as:

```text
pages
components
composables
middleware
```

### Pages

Pages represent full screens in the web app.

Possible examples for our project are:

```text
Home
People Directory
Individual Profile
Projects Directory
Individual Project
Edit Profile
Notifications
```

### Components

Components are reusable pieces of the interface.

Instead of rewriting the same design many times, we can make components such as:

```text
Profile Card
Project Card
Navigation Bar
Contact Links
Search Filters
Profile Form
```

Then the same component can be reused across different pages.

### Middleware

Middleware can help control access to certain pages.

For example, if a user is not logged in, we may want to redirect them away from the profile edit page.

Admin pages could also have checks so normal users cannot access them.

However, frontend checks should not be the only security. The backend should also verify that the user is allowed to perform an action.

---

# 4. Nuxt Server and API Routes

Nuxt also gives us a backend through its `server` folder.

The main part that will matter to us is:

```text
server/api/
```

Files inside this folder can become API endpoints.

For example, we could eventually have endpoints for:

```text
profiles
projects
notifications
```

The basic flow would be:

```text
User opens page
      ↓
Nuxt page requests data
      ↓
Nuxt server API receives request
      ↓
API uses Drizzle
      ↓
Drizzle reads from SQLite
      ↓
Data is returned to the page
```

This seems like one of the most important ideas for us to understand.

The frontend should not directly connect to the database.

Instead, the frontend should call an API, and the API should be responsible for using Drizzle to get or update information.

That keeps the project more organized and also keeps database logic and private information on the server.

---

# 5. What Drizzle Is Used For

Drizzle is the ORM being used in the project.

An ORM helps the application communicate with the database from code.

Since our database is SQLite, Drizzle lets us describe tables in TypeScript and then work with the database without putting raw SQL everywhere in the project.

Drizzle can be used for:

- defining tables
- defining relationships
- creating database migrations
- reading records
- adding records
- updating records
- deleting records
- creating indexes and constraints

The biggest benefit for our project is that the database structure can stay connected to the TypeScript code.

This should make it easier for the team to understand what data exists and what type of data each field should contain.

---

# 6. How Drizzle Fits Our Database Design

From the database diagram our team created, the main information we need to store is related to:

- users
- profiles
- projects
- project membership
- contact information
- notifications
- messages
- possible future posts/comments/likes

The most important relationship seems to be between users and projects.

A single user can participate in multiple projects, and a single project can have multiple users.

That means this is a many-to-many relationship.

A simple structure for that is:

```text
User
  ↓
Project Membership
  ↓
Project
```

The membership table can store extra information about the relationship, such as:

- the user's role
- their contribution
- which project they were on

This could then support both sides of the application.

From a profile page, we could display all the projects a person worked on.

From a project page, we could display all the students or alumni who worked on that project.

---

# 7. Possible Improvement to the Current Database Model

While looking at the database diagram, I noticed that we currently have both:

```text
user_projects
project_teams
```

Both tables appear to connect a user to a project.

Unless we decide that these tables have completely different purposes, it may be simpler to use one table for the relationship.

For example:

```text
project_memberships
```

could store:

```text
user
project
role
contribution
```

This would avoid storing the same relationship in two different places.

This is something the team should confirm before finalizing the schema.

---

# 8. Better Auth and User Profiles

The project already uses Better Auth for login.

One thing that seems important is separating authentication information from Alumni Tracker profile information.

Better Auth should handle things such as:

- user identity
- sessions
- login
- email verification
- OTP authentication

Our own profile data should handle things such as:

- first and last name
- graduation year
- major
- profile type
- company
- job title
- LinkedIn
- GitHub
- Discord
- profile photo
- projects

This means we probably should not build another authentication system inside our own profile tables.

The authentication user should be connected to the Alumni Tracker profile through the user's ID.

---

# 9. Important User ID Detail

One thing I noticed from our current seed output is that the Better Auth user ID is not a simple integer.

It looked like:

```text
8bc40c6a-0dcf-4952-9136-0635a2e5867b
```

Our database diagram currently shows user IDs as integers.

This is something we should check before creating more tables.

If the main Better Auth user ID is stored as text, then foreign keys pointing to that user should use the same type.

Otherwise, we could create a mismatch between our custom tables and the authentication tables.

---

# 10. Profiles

The profile feature is one of the main parts of the MVP.

The project plan says profiles should contain information such as:

- name
- profile type
- graduation year
- contact links
- profile image
- associated EPICS projects

Based on the database design, we may also want:

- major
- current company
- job title
- city
- summary

A user should be able to view their profile and edit their own information.

Other users should be able to view the profile depending on the privacy rules we decide on.

This means the profile feature will probably use:

```text
Nuxt page
+
profile form/components
+
API route
+
Drizzle query
+
SQLite profile table
```

---

# 11. Projects

Projects should probably have their own table instead of storing project information directly on user profiles.

Useful project information includes:

- project name
- description
- semester
- GitHub URL
- client
- status

Then a separate membership table can connect users to projects.

This makes it much easier to avoid duplicated information.

For example, the GitHub URL for one EPICS project should ideally be stored once on the project instead of being copied into every team member's profile.

---

# 12. Search and Filtering

A searchable database is one of the main requirements of the Alumni Tracker.

The main idea is that Nuxt would collect the user's filters, send them to the backend, and Drizzle would create a database query.

Possible filters include:

- name
- graduation year
- major
- profile type
- company
- project
- semester

For the size of our project, normal SQLite filtering should probably be enough at first.

We do not need an advanced search system immediately.

The important thing is making sure the database fields we want to search are stored consistently.

We can also add indexes to fields that are searched often if performance becomes important.

---

# 13. Authentication and Security

There are a few basic security ideas we should follow while implementing the project.

## Do not let the frontend directly access the database

Database queries should stay inside server-side code.

## Do not trust user IDs sent from the browser

If someone edits their profile, the server should use the logged-in user's session to determine which profile should be updated.

Otherwise, someone could potentially change an ID in a request and try to edit another user's profile.

## Keep secrets on the server

Things such as:

```text
Better Auth secret
email password
SMTP credentials
database configuration
```

should never be exposed to the frontend.

## Verify permissions on the backend

Even if an admin button is hidden in the interface, the server should still verify that the person making the request is actually an admin.

---

# 14. Email OTP

Our project already has an email OTP flow using Better Auth.

Because Better Auth already handles OTP authentication, we should be careful about adding separate fields like:

```text
otp_code
otp_verified
```

to our own user table.

It may be unnecessary and could create duplicated authentication information.

Before finalizing this part of the schema, we should check how the current Better Auth tables already store and manage verification.

---

# 15. Notifications

The project plan also includes notifications.

A basic notification table could store:

- the user receiving the notification
- notification type
- message
- whether it has been read
- creation date

The Nuxt page could request notifications from an API, and the API would use Drizzle to load the correct notifications for the logged-in user.

I think we should start simple instead of trying to create a complicated real-time notification system immediately.

---

# 16. Messaging

Messaging appears in the current requirements, and the ER diagram already includes a messages table.

The current structure of:

```text
sender
receiver
content
read status
created date
```

makes sense for a simple direct-message system.

However, our Project Plan also mentions that messaging/community features may become stretch features.

Because of that, I think the team should confirm how important internal messaging is before spending too much time implementing it.

For the MVP, contact links such as LinkedIn, GitHub, or Discord may already cover part of the communication goal.

---

# 17. Nuxt UI

Nuxt UI is mainly useful for building the visual parts of the application.

We can use its components for things such as:

- forms
- buttons
- dropdowns
- profile cards
- avatars
- search boxes
- tables
- alerts
- navigation

This should save us time compared to building every component completely from scratch.

Nuxt UI should mainly be treated as the presentation layer.

The actual application logic should still be handled through Nuxt server routes, authentication, and Drizzle.

---

# 18. Database Migrations

Drizzle also helps manage changes to the database.

Instead of everyone manually editing their local `dev.db`, the team should use database migrations.

The basic idea is:

```text
change TypeScript schema
      ↓
generate migration
      ↓
review migration
      ↓
run migration
      ↓
database is updated
```

This is especially useful for a team project because the database changes can be committed to GitHub and shared with everyone.

It also makes it easier for someone to clone the repository later and recreate the correct database structure.

---

# 19. Suggested Project Structure

Our repository already contains the main folders we need:

```text
app/
server/
drizzle/
docs/
public/
tests/
```

A possible organization is:

```text
app/
  pages/
  components/
  middleware/

server/
  api/
  db/

drizzle/
  migrations

docs/
  research and project documentation
```

The exact folder structure may change as we build more features, but the main idea is to keep frontend, backend, and database responsibilities separated.

---

# 20. How the Main Features Could Connect

## Profile

```text
Profile Page
    ↓
Profile API
    ↓
Drizzle
    ↓
Profile Table
```

## Projects

```text
Project Page
    ↓
Project API
    ↓
Drizzle
    ↓
Projects + Memberships
```

## Search

```text
Search Page
    ↓
Search Filters
    ↓
API
    ↓
Drizzle Query
    ↓
SQLite
```

## Login

```text
Login Page
    ↓
Better Auth
    ↓
Email OTP
    ↓
Authenticated Session
```

---

# 21. Things the Team Should Confirm

After researching the stack and comparing it to our current diagrams, I think these are the main questions we should clear up before we get too deep into implementation.

### 1. What is the exact type of the Better Auth user ID?

Our seed output looks like a string/UUID-style ID, while the diagram shows integers.

### 2. Do we need both `user_projects` and `project_teams`?

They currently look like they may represent the same relationship.

### 3. Should contact information be its own table?

The contact table in the current diagram needs a clear connection back to the user.

For the MVP, keeping contact fields directly on the profile may be easier.

### 4. Should we keep custom OTP fields?

Probably not if Better Auth already manages OTP verification.

### 5. Is messaging part of the MVP or a stretch goal?

The project documents are not completely consistent about this.

### 6. What are the final profile types?

Different project notes mention student, alumni, mentor, admin, sponsor, and client.

We should make one final list before building the database constraints and frontend forms.

### 7. What is R-07?

The Project Plan references R-07, but the Project Brief version I reviewed does not currently define it.

---

# 22. Recommended Order for Implementation

Based on what I learned, I think a good order is:

1. Make sure the current Nuxt app, database, and authentication are working.
2. Finalize the profile and project tables.
3. Make sure user IDs match the Better Auth schema.
4. Run the Drizzle migrations.
5. Build profile viewing.
6. Build profile editing.
7. Connect users to projects.
8. Build the project directory and project pages.
9. Add people search and filtering.
10. Add notifications.
11. Work on messaging or social features only after the main MVP is working.

This keeps us focused on the important features before spending time on extra features.

---

# 23. Main Takeaways

The biggest thing I learned from researching Nuxt and Drizzle is that they are meant to work as separate layers of the application.

Nuxt handles the pages, interface, routing, and server API.

Drizzle handles communication between the server and SQLite.

Better Auth should handle authentication instead of our custom profile tables.

The main architecture should look something like:

```text
Nuxt Frontend
     ↓
Nuxt Server API
     ↓
Drizzle ORM
     ↓
SQLite
```

For our data, the main relationship should probably be:

```text
Authenticated User
     ↓
Profile
     ↓
Project Membership
     ↓
Project
```

If we keep those responsibilities separated, it should make the project easier to develop and easier for different team members to work on at the same time.

---

# 24. Sources Used

I mainly used the official documentation for the tools already included in our project.

## Nuxt

- Nuxt Directory Structure  
  https://nuxt.com/docs/4.x/directory-structure

- Nuxt Server Directory  
  https://nuxt.com/docs/4.x/directory-structure/server

- Nuxt Pages  
  https://nuxt.com/docs/4.x/directory-structure/app/pages

- Nuxt Route Middleware  
  https://nuxt.com/docs/4.x/directory-structure/app/middleware

- Nuxt useFetch  
  https://nuxt.com/docs/4.x/api/composables/use-fetch

## Drizzle

- Drizzle ORM Documentation  
  https://orm.drizzle.team/docs/overview

- Drizzle Data Querying  
  https://orm.drizzle.team/docs/data-querying

- Drizzle SQLite Column Types  
  https://orm.drizzle.team/docs/sqlite/column-types

- Drizzle Indexes and Constraints  
  https://orm.drizzle.team/docs/indexes-constraints

- Drizzle Migrations  
  https://orm.drizzle.team/docs/migrations

## Better Auth

- Better Auth Nuxt Integration  
  https://better-auth.com/docs/integrations/nuxt

- Better Auth Drizzle Adapter  
  https://better-auth.com/docs/adapters/drizzle

- Better Auth Email OTP  
  https://better-auth.com/docs/plugins/email-otp

## Nuxt UI

- Nuxt UI Documentation  
  https://ui.nuxt.com/docs

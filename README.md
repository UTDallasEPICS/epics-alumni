# EPICS Alumni Tracker (Better Auth + Drizzle + SQLite)

An EPICS alumni application with email OTP sign-in, persistent profiles, onboarding, and an authenticated directory based on explicit publication consent.

## Features

- **Nuxt 4**: The latest and greatest from the Nuxt team. 
- **Better Auth**: Comprehensive authentication with **Email OTP** support.
- **Drizzle**: Type-safe ORM for interacting with the database.
- **SQLite**: Lightweight, zero-configuration database, ideal for development and small-to-medium projects.
- **Nuxt UI v4**: Beautiful, accessible, and customizable UI components built with Tailwind CSS.
- **Nodemailer**: Pre-configured for sending verification emails via Gmail.
- **Vitest**: Profile, privacy, migration, component, and HTTP integration tests. See [Testing](#testing).

## Stack

- **Framework**: [Nuxt](https://nuxt.com/)
- **Auth**: [Better Auth](https://www.better-auth.com/)
- **ORM**: [Drizzle](https://orm.drizzle.team/)
- **Database**: [SQLite](https://sqlite.org/)
- **UI Framework**: [Nuxt UI](https://ui.nuxt.com/)
- **Email**: [Nodemailer](https://nodemailer.com/)

## Getting Started

See the [Documentation](#documentation) section for topic guides. Otherwise, follow the setup steps below.

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd epics-alumni
```

### 2. Install dependencies

This project uses `pnpm` for dependency management. Use `pnpm` to keep dependency versions consistent with the repository lockfile. Also, remember to use git-bash for these commands.

First, make sure Node.js is installed and check whether `pnpm` is available:

```bash
node -v
pnpm --version
```

If `pnpm` is not installed, enable it with `Corepack`:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

On macOS, if corepack enable gives a permission error, run the follwing and enter you mac's password:

```bash
sudo corepack enable
corepack prepare pnpm@latest --activate
```

After `pnpm` is available, install the project dependencies:

```bash
pnpm install
```

### 3. Setup Environment Variables

Copy the example environment file and fill in your details.

```bash
cp .env.example .env
```

Open `.env` and configure the following:

- `DATABASE_URL`: The SQLite connection string (default: `file:./dev.db`).
- `BETTER_AUTH_SECRET`: A secure random string for encryption. You can generate one using `openssl rand -hex 32`.
- `BETTER_AUTH_URL`: The base URL of your application (default: `http://localhost:3000`).
- `EMAIL_USER`: Your Gmail address (for OTP delivery).
- `EMAIL_PASS`: Your Gmail App Password. [How to generate an App Password](https://support.google.com/accounts/answer/185833).
- `EMAIL_HOST` and `EMAIL_FROM`: SMTP hostname and the permitted sender address. SMTP uses port 587 with STARTTLS when advertised; transport timeouts are bounded.
- `UPLOAD_STORAGE_PATH`: Private persistent avatar storage, normally `.data/uploads`, outside `public`. Keep this directory and the SQLite file on persistent writable storage in deployment. Do not serve the upload directory through a web server or CDN.

Keep `.env`, databases, and uploaded files out of Git. Existing installations configured with `public/images` remain supported through the authenticated avatar endpoint; direct `/images/users/**` and optimizer access are blocked, and legacy uploads are excluded from build output. If a reverse proxy separately serves the source `public` directory, block that path there too or move the upload tree to private storage and update the variable. The application does not move or delete existing uploads.

### 4. Database Setup

Initialize your SQLite database and run migrations. You will need to run this command anytime you need to change or create a database.

```bash
pnpm db:migrate
```

Migration `0002_profile_publication.sql` adds `profile.directoryPublished`, non-null and false by default. Apply it before starting this version. It preserves existing profiles and keeps them private. Historical migrations are unchanged. Back up the actual SQLite file before a deployment migration; the automated migration tests use temporary files only.

During development, if there are any database changes since the last migration, you will need to generate a new migration.

```bash
pnpm db:generate
```

### 5. Start the development server

```bash
pnpm dev
```

Your application will be available at `http://localhost:3000`.

### 6. Sign in and demonstrate the MVP

1. Open `http://localhost:3000`. Unauthenticated visitors go to `/auth`.
2. Enter an email inbox you control and request a code. New accounts are created automatically after a valid OTP; no account seed is required.
3. Enter the emailed six-digit code. On the profile page, complete name, major, and graduation year, then save. Completion comes from saved database values.
4. Edit company, job title, biography, professional HTTPS links, or upload a JPEG/PNG/WebP image (maximum 5 MiB). Refresh to verify persistence.
5. Check **Make my completed profile visible to signed-in EPICS members** and save. Completing onboarding alone never publishes a profile.
6. Open `/people`; search by name, combine filters, change page size, and open a profile. Only complete, consenting profiles appear; email addresses are excluded.
7. Uncheck publication and save. The profile and its avatar become unavailable to other members, including through direct URLs. Clearing a required field also revokes visibility; completing it again requires a new opt-in.
8. Use **Logout** on the profile page. Refresh `/people` to confirm the login redirect. A returning completed user skips onboarding.

SMTP acceptance is not proof of inbox delivery. Confirm the live-provider flow manually with an inbox you control, including retry after a provider failure. Delivery failures return a generic retryable error and keep the login form on the email step. Never obtain login codes from a production database.

### Optional isolated demonstration data

This opt-in seed creates fictional profiles only in a database named `epics-demo.sqlite`, requires development mode, and never runs during startup or deployment. Twelve samples are published, one is private, and one is incomplete. Re-running preserves edits and withdrawn consent. Sample addresses use `example.invalid` and cannot receive login email; sign in with your own inbox to browse them.

```bash
mkdir -p .data
DATABASE_URL=file:./.data/epics-demo.sqlite pnpm db:migrate
NODE_ENV=development EPICS_SEED_DEMO=1 DATABASE_URL=file:./.data/epics-demo.sqlite pnpm db:seed
DATABASE_URL=file:./.data/epics-demo.sqlite pnpm dev
```

Choose 10 results per page to demonstrate pagination, or search `Demo Alumnus` and filter company `Demo Robotics`.

## Project Structure

- `app/`: Frontend code (pages, components, assets, composables).
- `server/`: Backend code (API routes, authentication logic, database utilities).
- `server/db/`: Database schema and seed scripts.
- `drizzle/`: Generated migrations.
- `public/`: Static assets.
- `tests/`: Automated tests (Vitest).
- `docs/`: Topic guides (see [Documentation](#documentation)).

## Documentation

Topic guides live in the [`docs/`](docs/) directory:

- [`docs/testing.md`](docs/testing.md) — Vitest testing guide (from-zero, for beginners).
- [`docs/better_auth.md`](docs/better_auth.md) — Better Auth setup and usage.
- [`docs/file_upload_and_serve.md`](docs/file_upload_and_serve.md) — Uploading and serving files.
- [`docs/mcp.md`](docs/mcp.md) — Recommended MCP servers for AI coding assistants.

## Testing

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
pnpm exec tsx scripts/verify-mvp.ts
# Optional: also verify the development server and Vite asset protection
pnpm exec tsx scripts/verify-mvp.ts --dev
```

The Vitest suites cover real SQLite profile and directory handlers, avatar filesystem safety, migration upgrades, seed guards, and mounted Nuxt components. `mvp-http.test.ts` uses real loopback HTTP and the installed Better Auth OTP/session implementation; only outbound email is mocked. It verifies failed delivery, retry, concurrency, expiry, replay, logout, onboarding, publication, and private-data restrictions. No test uses the application database or real email credentials. The suite needs permission to bind a local port. Font downloads are disabled for component tests.

`verify-mvp.ts` starts the built production server with its own temporary migrated SQLite file and private uploads. It checks real HTTP and server-rendered pages, redirects, profile persistence, directory filters/details, publication withdrawal, avatar authorization, static/optimizer blocking, and logout, then cleans up. It inserts known OTP records only in that disposable database; it does not verify SMTP, inbox delivery, or interactive browser layout. Run it after building the current code.

For the focused authentication regression:

```bash
pnpm exec vitest run tests/nuxt/mvp-http.test.ts
```

Before release, also run the demonstration flow in desktop and mobile browsers and verify actual inbox delivery. The automated HTTP and component tests do not replace those checks. General testing guidance remains in [docs/testing.md](docs/testing.md).

## GitHub Actions Configuration

**Important**: You must update the GitHub Actions workflow to point to your own repository and AWS configuration.

### Update GitHub Actions

Add the following Secrets and Variables to your repository:

1. **ACTIONS_ROLE_ARN (Secret)**:

   ```yaml
   arn:aws:iam::YOUR-AWS-ACCOUNT-ID:role/YOUR-ROLE-NAME
   ```

2. **REPOSITORY (Variable)**:

   ```yaml
   your-repository-name
   ```

Optionally, you may update the AWS region.

3. **AWS Region** (the `aws-region` in `.github/workflows/deploy.yml`):
   ```yaml
   aws-region: your-aws-region
   ```

### Required AWS Setup

Before the GitHub Actions will work, you need:

1. **AWS ECR Repository**: Create a repository in Amazon ECR
2. **IAM Role**: Create a role with GitHub Actions OIDC provider and ECR permissions
3. **GitHub Secrets**: Ensure your repository has the necessary AWS permissions

## License

MIT

Rudra is working on the backend. 
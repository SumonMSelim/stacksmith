# Stacksmith 🔨

**Describe your app in one sentence, get a provisioned architecture plan for the Stripe Projects CLI.**

Stacksmith is an AI-powered tool that takes a one-line app idea (e.g. *"I need a private feedback app with login, search, and AI summaries"*) and outputs:

- Recommended Stripe Projects providers
- Why each service was chosen
- Exact `stripe projects add` setup commands
- A starter `.env` map

Generate anonymously, or log in to save your idea history.

**Stack:** Next.js, OpenRouter (AI), Supabase (auth + database), Vercel (hosting), all provisioned via the [Stripe Projects CLI](https://projects.dev).

---

## About this guide

This README is a **complete, step-by-step log of how Stacksmith was built and deployed** for the *Build with Stripe Community* hackathon (Stripe Dhaka AI Event 2026). Every step below was actually executed, in order. Follow the same steps to build and ship your own app.

> **Hackathon code:** `stripe-dhaka-aievent2026`
> **Participant instructions:** https://projects.dev/hackathon-participants
> **Leaderboard:** https://projects.dev/leaderboard

---

## Step 0: Prerequisites ✅

You need:

- [x] A laptop (not a tablet)
- [x] An agentic coding environment (Claude Code, Cursor, Kiro; IDE or terminal-based)
- [x] A Stripe account
- [x] The Stripe CLI + `projects` plugin

### 0.1 Create a Stripe account (if you don't have one)

1. Go to https://dashboard.stripe.com/register
2. Add a business name
3. Skip additional information for now
4. Click **Go to sandbox**
5. Note your account ID in the URL (looks like `acct_***`); you'll need it for the leaderboard

### 0.2 Install the Stripe CLI + Projects plugin

```shell
# macOS (Homebrew)
brew install stripe/stripe-cli/stripe && stripe plugin install projects

# Any platform (npm)
npm i @stripe/cli -g
```

Or just tell your agent:

> Install the Stripe CLI, install the `projects` plugin, verify `stripe projects --help` works.

Optionally install the Stripe skills for your agent:

```shell
npx skills add https://docs.stripe.com
# select: stripe-best-practices, stripe-projects
```

### 0.3 Verify

```shell
stripe login
stripe --version            # we had: 1.50.3
stripe projects --help      # plugin works
stripe whoami               # confirms login + shows acct_***
```

**Our result:** CLI logged in, plugin installed. ✅


**Checking what the CLI is pointed at:**

```shell
stripe whoami          # active context + authorized contexts
stripe config --list   # profiles on this machine
stripe switch context <acct_id> --live   # switch context without re-auth
```

---

## Step 1: Initialize Stripe Projects ✅

From the project root (an existing directory is fine, use `--yes`):

```shell
stripe projects init stacksmith --yes
```

**Our result:**

```
○ Creating project "stacksmith"...
OK: Authenticated with Stripe
 │  Project        stacksmith (project_***)
 │  Account        Stacksmith (acct_***)
 │  ✓ Created .projects/
 │  ✓ Updated .gitignore
 │  ✓ Created .claude/settings.json (permissions)
 │  ✓ Created skills/stripe-projects-cli - 6 files (Claude, Cursor, AGENTS.md)
```

What `init` gives you:

- `.projects/state.json`: source of truth for providers/resources (**commit this**)
- `.projects/state.local.json`: your account/resource associations (**commit this too**, teammates need it for `stripe projects link`)
- `.projects/vault/` + `.env`: credentials (auto-gitignored, **never commit**)
- `skills/stripe-projects-cli/`: agent skills so Claude/Cursor know how to drive the CLI

---

## Step 2: Add providers ✅

Stacksmith needs three services. Each provider's terms require explicit acceptance (linking shares your name, email, country, and phone with the provider), so review their ToS first, then add with `--accept-tos`:

```shell
# AI - powers the architecture generation
stripe projects add openrouter/api --accept-tos --yes

# Hosting - plan first, then the project resource
stripe projects add vercel/hobby   --accept-tos --yes
stripe projects add vercel/project --accept-tos --yes

# Auth + database - plan first, then the project resource
stripe projects add supabase/free    --accept-tos --yes
stripe projects add supabase/project --accept-tos --yes
```


**Gotchas we hit:**

- `PLAN_REQUIRED`: Vercel and Supabase need a *plan* resource provisioned before the *project* resource. The error message tells you the exact command; run it, then retry.
- OpenRouter returned a transient `500 Internal Server Error` on first attempt. Retrying a minute later worked.


**Verify:**

```shell
stripe projects status   # all providers checked as Linked, all Free tier
stripe projects env      # env var NAMES (values redacted)
```


Our `.env` was auto-populated with everything the app needs, no dashboard visits, no copy-pasting keys:

| Resource         | Env vars                                                                                                                                 |
|------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| openrouter-api   | `OPENROUTER_API_KEY`, `OPENROUTER_TYPE`                                                                                                  |
| supabase-project | `SUPABASE_PROJECT_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_POOLER_URL`, `SUPABASE_DB_PASS`, `SUPABASE_PROJECT_REF` |
| vercel-project   | `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_URL`                                                               |

Total cost so far: **€0**, everything on free tiers.

---

## Step 3: Build the app ✅

### The prompt

This was the initial prompt given to the agent, after picking the idea and stack in planning:

```markdown
Build "Stacksmith": describe your app in one sentence, get a provisioned
architecture plan back. Input: a one-line app idea (e.g. "I need a private
feedback app with login, search, and AI summaries"). Output: recommended
Stripe Projects providers, why each was chosen, exact `stripe projects add`
setup commands, and a starter .env map.

Requirements:
- Anyone can generate a plan with no login required.
- Add an optional login so a user can save their generated plans and revisit
  them later (idea history).
- Use the Stripe Projects CLI to provision whatever services the app itself
  needs (not the services it recommends to the user).
- Stack: Next.js, OpenRouter for the AI call, Supabase for auth + database,
  Vercel for hosting.
- The model must only recommend real Stripe Projects provider slugs, never
  invented ones, and must get the plan-before-project provisioning order
  right for providers that need it (e.g. Vercel, Supabase).
- Simple, dark UI. Write tests for any non-trivial logic (e.g. parsing the
  model's JSON output).
```


Key design decisions for Stacksmith:

- **The system prompt embeds the provider catalog** so the model only recommends real `stripe projects add` slugs, including the plan-before-project ordering we learned in Step 2.
- **Anonymous-first**: anyone can generate; logging in (Supabase magic link) unlocks saved history.
- **Free-model fallback chain**: free OpenRouter model pools get rate-limited upstream (we saw live 429s), so the API route tries several `:free` models in order until one answers with parseable JSON.
- **Row-level security**: the `stacks` table policies restrict reads/writes to `auth.uid() = user_id`, so the browser can talk to Supabase directly with just the publishable key.

### Apply the database schema

We ran `psql` in Docker against the Supabase pooler, with credentials injected via `--env-file .env` (so secrets never get printed):

```shell
docker run --rm --env-file .env -v "$PWD/supabase:/sql:ro" postgres:16-alpine sh -c '
  pass=$(printf "%s" "$SUPABASE_DB_PASS" | tr -d "\x27\"")
  purl=$(printf "%s" "$SUPABASE_POOLER_URL" | tr -d "\x27\"" | sed "s/\[YOUR-PASSWORD\]/$pass/")
  psql "$purl" -v ON_ERROR_STOP=1 -f /sql/schema.sql'
```

**Gotchas we hit:**

- `.env` values written by Projects are single-quoted, and Docker's `--env-file` keeps quotes literally; strip them before use.
- `SUPABASE_POOLER_URL` contains a literal `[YOUR-PASSWORD]` placeholder; substitute `SUPABASE_DB_PASS` into it.
- The direct `SUPABASE_DB_URL` host wasn't reachable from our network (IPv6); the pooler URL worked.

### Test and build

```shell
docker run --rm -v "$PWD:/app" -w /app node:22-alpine \
  sh -c "npm install && npx vitest run && npm run build"
```

Our result: 5/5 tests passed, clean production build.

---

## Step 4: Deploy ✅

Projects already gave us everything for a fully non-interactive Vercel deploy: `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID`. No `vercel login`, no dashboard.

Two things to do: copy the runtime env vars to Vercel, then deploy.

```shell
docker run --rm --env-file .env -v "$PWD:/app" -w /app node:22-alpine sh -c "
  clean() { printf '%s' \"\$1\" | tr -d \"'\\\"\"; }
  export VERCEL_TOKEN=\$(clean \"\$VERCEL_TOKEN\")
  export VERCEL_ORG_ID=\$(clean \"\$VERCEL_ORG_ID\")
  export VERCEL_PROJECT_ID=\$(clean \"\$VERCEL_PROJECT_ID\")
  clean \"\$OPENROUTER_API_KEY\"       | npx -y vercel env add OPENROUTER_API_KEY production --force
  clean \"\$SUPABASE_PROJECT_URL\"     | npx -y vercel env add SUPABASE_PROJECT_URL production --force
  clean \"\$SUPABASE_PUBLISHABLE_KEY\" | npx -y vercel env add SUPABASE_PUBLISHABLE_KEY production --force
  npx -y vercel deploy --prod -y"
```

(Not using Docker? Plain `npx vercel deploy --prod` works the same once the three `VERCEL_*` vars are exported.)


**Gotcha we hit:** our first live test returned `402` from OpenRouter, a fresh account has no credits and the default `openrouter/auto` routes to paid models. Fix: use `:free` models (list them at `https://openrouter.ai/api/v1/models`), and keep a fallback chain because individual free pools return upstream `429`s.

**Live app:** https://stacksmith-seven.vercel.app

---

## Step 5: Share & submit to the leaderboard ✅

```shell
stripe projects share   # generates a self-contained stack URL
stripe whoami           # your account ID (acct_*) for the submission form
```

Our share URL: https://projects.dev/s#v1:OpenRouter~api,Supabase~project,Vercel~project

Anyone can recreate this exact stack with:

```shell
stripe projects init --from "https://projects.dev/s#v1:OpenRouter~api,Supabase~project,Vercel~project"
```

Submit on the leaderboard with hackathon code **`stripe-dhaka-aievent2026`** in the hackathon code field.

---

## Credential hygiene

If a credential ever leaks (pasted in a chat, committed by accident), rotate it with one command:

```shell
stripe projects rotate supabase/project
stripe projects rotate openrouter/api
stripe projects env --pull   # runs automatically after rotate, but harmless to re-run
```

We rotated our Supabase credentials after this build because the DB password appeared in a local debug log.

---

## Cheat sheet

```shell
stripe projects init <app-name>            # init a project
stripe projects catalog                    # see providers
stripe projects add <provider>/<service>   # add a provider
stripe projects open <provider>            # open provider dashboard
stripe projects env --pull                 # sync env vars
stripe projects spend                      # see your spend
stripe projects share                      # share your project (leaderboard)
stripe projects status                     # check linked providers
stripe projects rotate <provider>/<service># rotate credentials
```

Docs: https://docs.stripe.com/projects

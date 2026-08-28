// Condensed Stripe Projects provider catalog, embedded in the system prompt so
// the model only recommends real providers and real `stripe projects add` slugs.
// Source: https://docs.stripe.com/projects (run `stripe projects catalog` for the live list).
export const PROVIDER_CATALOG = `
hosting: vercel/project (requires vercel/hobby or vercel/pro plan first), netlify, cloudflare, railway, render, flyio, wix, laravel-cloud, e2b, daytona
database: supabase/project (postgres, requires supabase/free plan first), neon/postgres, planetscale, turso/database, railway/postgres, railway/mongo, flyio/mpg, clickhouse, prisma, chroma (vector), upstash/vector (vector), upstash/redis (kv)
auth: supabase/project (bundled with database), auth0, clerk, workos, neon (bundled), privy
ai: openrouter/api (500+ models via one API), huggingface, elevenlabs (voice), heygen (video), chatbase, composio, exa, parallel, browserbase (browser agents), kernel, steelbrowser
analytics: posthog (also feature flags), mixpanel, amplitude (also feature flags), datadog, pydantic
observability: sentry, datadog, gitlab, pydantic
cache/queue: upstash/redis, cloudflare/hyperdrive, railway/redis, inngest (queue)
search: algolia, exa, firecrawl (crawl), tabstack, supermemory
email/communications: agentmail, customer-io, klaviyo, twilio, postalform, agentphone
payments: metronome (usage billing), revenuecat (mobile subs), schematic (entitlements), privy
domains: spaceship, squarespace, wordpress-com
ci/cd & compute: gitlab, depot, createos, blaxel, runloop (sandboxes)
storage: cloudflare, railway, huggingface, supabase (bundled)
`.trim();

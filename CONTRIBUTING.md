# Contributing to Stacksmith

Thanks for your interest in contributing! Stacksmith is a small community
project built for the Build with Stripe Community hackathon, and contributions
of all kinds are welcome — bug reports, feature ideas, docs fixes, and code.

## Getting started

1. Fork the repository and clone your fork.
2. Create a `.env.local` with the required variables (see the README for the
   full setup walkthrough):
   - `OPENROUTER_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Install dependencies and run the dev server:

   ```sh
   npm install
   npm run dev
   ```

   Or with Docker:

   ```sh
   docker run --rm -it -v "$PWD:/app" -w /app -p 3000:3000 node:22-alpine \
     sh -c "npm install && npm run dev"
   ```

## Making changes

- Create a feature branch off `main` (never commit directly to `main`):

  ```sh
  git checkout -b feat/short-description
  ```

- Keep changes focused. One pull request per fix or feature.
- Match the existing code style and patterns.
- Add or update tests for any logic you add or change:

  ```sh
  npm test
  ```

- Make sure the build passes before opening a PR:

  ```sh
  npm run build
  ```

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <short description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`,
`build`, `ci`, `revert`.

- Subject line ≤ 72 characters, lowercase, no trailing period.
- Explain *why* in the body when the change isn't obvious.

## Pull requests

1. Push your branch to your fork and open a PR against `main`.
2. Describe what the change does and why.
3. Link any related issues.
4. PRs are squash-merged, so a clean PR title matters more than individual
   commit messages.

## Reporting bugs and requesting features

Use the [issue templates](https://github.com/sumonmselim/stacksmith/issues/new/choose).
For bugs, include steps to reproduce and what you expected to happen.

## Code of Conduct

By participating, you agree to follow our
[Code of Conduct](CODE_OF_CONDUCT.md).

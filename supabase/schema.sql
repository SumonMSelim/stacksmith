-- Stacksmith: saved stack plans, one row per generated architecture a user keeps.
create table if not exists public.stacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  idea text not null,
  plan jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.stacks enable row level security;

create policy "users read own stacks"
  on public.stacks for select
  using (auth.uid() = user_id);

create policy "users insert own stacks"
  on public.stacks for insert
  with check (auth.uid() = user_id);

create policy "users delete own stacks"
  on public.stacks for delete
  using (auth.uid() = user_id);

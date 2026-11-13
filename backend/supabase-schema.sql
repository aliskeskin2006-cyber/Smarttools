-- SmartTools: run in a dedicated Supabase project's SQL editor.
-- Never expose service_role key in browser code.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null check (provider in ('iyzico','stripe','manual')),
  provider_subscription_id text unique,
  status text not null check (status in ('active','trialing','past_due','canceled','expired')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists public.usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  period_start date not null,
  used integer not null default 0 check (used >= 0),
  primary key (user_id,feature,period_start)
);
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
create policy "read own profile" on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy "read own subscription" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
create policy "read own usage" on public.usage_counters for select to authenticated using (auth.uid() = user_id);
-- No browser insert/update/delete policies. Server functions using service role
-- verify the signed-in user and atomically consume quota.
-- Subscription changes must come ONLY from verified payment-provider webhooks.

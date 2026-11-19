create table if not exists public.menu_items (
  id text primary key,
  category text not null,
  name text not null,
  description text not null default '',
  price numeric not null default 0,
  featured boolean not null default false,
  position integer not null default 0
);

create table if not exists public.orders (
  id text primary key,
  created_at timestamptz not null default now(),
  status text not null default 'new',
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  customer_notes text not null default ''
);

alter table public.menu_items enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Public can read menu" on public.menu_items;
drop policy if exists "Public admin menu writes" on public.menu_items;
drop policy if exists "Public can create orders" on public.orders;
drop policy if exists "Public can read orders" on public.orders;
drop policy if exists "Public can update orders" on public.orders;

create policy "Public can read menu" on public.menu_items
  for select to anon using (true);

create policy "Public admin menu writes" on public.menu_items
  for all to anon using (true) with check (true);

create policy "Public can create orders" on public.orders
  for insert to anon with check (true);

create policy "Public can read orders" on public.orders
  for select to anon using (true);

create policy "Public can update orders" on public.orders
  for update to anon using (true) with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'menu_items'
  ) then
    alter publication supabase_realtime add table public.menu_items;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

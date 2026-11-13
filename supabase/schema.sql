-- Supabase schema for Pelmenchyk.
-- Run this file once in Supabase Dashboard > SQL Editor.

create table if not exists public.products (
  id integer primary key,
  category text not null,
  name text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  weight text not null default '',
  image text not null default '',
  art text not null default '',
  sauce text not null default '',
  available boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.site_settings (
  key text primary key,
  value text not null default ''
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  created_at timestamptz not null default now(),
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  phone text not null check (char_length(phone) between 7 and 20),
  delivery text not null check (delivery in ('pickup','delivery')),
  address text not null default '',
  comment text not null default '',
  items jsonb not null,
  total numeric(10,2) not null check (total >= 0),
  status text not null default 'new' check (status in ('new','confirmed','preparing','completed','cancelled'))
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_pelmenchyk_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid()); $$;
revoke all on function public.is_pelmenchyk_admin() from public;
grant execute on function public.is_pelmenchyk_admin() to anon, authenticated;

alter table public.products enable row level security;
alter table public.site_settings enable row level security;
alter table public.orders enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "Public can read products" on public.products;
create policy "Public can read products" on public.products for select to anon, authenticated using (true);
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products for all to authenticated using (public.is_pelmenchyk_admin()) with check (public.is_pelmenchyk_admin());

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Admins manage site settings" on public.site_settings for all to authenticated using (public.is_pelmenchyk_admin()) with check (public.is_pelmenchyk_admin());

drop policy if exists "Customers can submit orders" on public.orders;
create policy "Customers can submit orders" on public.orders for insert to anon, authenticated with check (true);
drop policy if exists "Admins read orders" on public.orders;
create policy "Admins read orders" on public.orders for select to authenticated using (public.is_pelmenchyk_admin());
drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders" on public.orders for update to authenticated using (public.is_pelmenchyk_admin()) with check (public.is_pelmenchyk_admin());
drop policy if exists "Admins delete orders" on public.orders;
create policy "Admins delete orders" on public.orders for delete to authenticated using (public.is_pelmenchyk_admin());

drop policy if exists "Admins can read own admin access" on public.admin_users;
create policy "Admins can read own admin access" on public.admin_users for select to authenticated using (user_id = auth.uid());

grant select on public.products, public.site_settings to anon, authenticated;
grant insert, update, delete on public.products, public.site_settings to authenticated;
grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;
grant select on public.admin_users to authenticated;

-- TradersProp production persistence for Vercel + Supabase.
-- Run this once in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  email text not null,
  challenge_id text,
  original_amount numeric,
  requested_amount numeric not null,
  amount_subunit bigint not null,
  currency text not null,
  payment_method text,
  channels jsonb not null default '[]'::jsonb,
  promo_code text,
  description text,
  status text not null default 'pending' check (status in ('pending','success','failed','abandoned','cancelled')),
  paystack_status text,
  paystack_data jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payment_orders_email_idx on public.payment_orders (lower(email));
create index if not exists payment_orders_status_idx on public.payment_orders (status);
create index if not exists payment_orders_created_idx on public.payment_orders (created_at desc);
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  phone text,
  country text,
  role text not null default 'client',
  kyc_status text not null default 'Not submitted',
  phone_verified boolean not null default false,
  referral_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payment_orders enable row level security;
alter table public.profiles enable row level security;
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists payment_orders_updated_at on public.payment_orders;
create trigger payment_orders_updated_at before update on public.payment_orders for each row execute function public.set_updated_at();
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- Pesapal provider fields (safe to run after the original schema)
alter table public.payment_orders add column if not exists provider text;
alter table public.payment_orders add column if not exists provider_reference text;
alter table public.payment_orders add column if not exists provider_tracking_id text;
create index if not exists payment_orders_provider_ref_idx on public.payment_orders(provider, provider_reference);

-- Pesapal reconciliation fields used by the merged production checkout.
alter table public.payment_orders add column if not exists provider_status text;
alter table public.payment_orders add column if not exists provider_confirmation_code text;

-- Production authentication linkage: users are managed by Supabase Auth.
alter table public.profiles add column if not exists auth_user_id uuid;
create unique index if not exists profiles_auth_user_id_idx on public.profiles(auth_user_id) where auth_user_id is not null;

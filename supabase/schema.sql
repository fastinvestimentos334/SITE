-- FAST INVESTIMENTOS — esquema inicial para Supabase/PostgreSQL.
-- Execute em projeto Supabase NOVO. Revise com profissional de segurança antes de produção.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  cpf text,
  role text not null default 'client' check (role in ('client','admin','support','finance_readonly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_cpf_unique on public.profiles(cpf) where cpf is not null and cpf <> '';
create index if not exists profiles_email_idx on public.profiles(email);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  group_name text not null,
  principal_amount numeric(14,2) not null check (principal_amount > 0),
  status text not null default 'pending_validation',
  maturity_date date,
  contract_version text,
  created_at timestamptz not null default now()
);
create index if not exists investments_user_created_idx on public.investments(user_id,created_at desc);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  investment_id uuid references public.investments(id),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'awaiting_payment' check (status in ('created','awaiting_payment','processing','paid','rejected','expired','cancelled','refunded','under_review')),
  provider_reference text unique,
  provider_name text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create index if not exists payments_user_created_idx on public.payments(user_id,created_at desc);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'requested' check (status in ('requested','under_review','approved','rejected','processing','paid','failed','cancelled')),
  admin_note text,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  paid_at timestamptz
);
create index if not exists withdrawals_user_created_idx on public.withdrawals(user_id,created_at desc);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.investment_groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  initial_amount numeric(14,2) not null check (initial_amount > 0),
  description text not null default '',
  enabled boolean not null default false,
  validation_status text not null default 'pending_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.investment_groups(code,name,initial_amount,description,enabled)
values ('GR50','GR 50',50,'Grupo de referência; indisponível até validação.',false),
('GR100','GR 100',100,'Grupo de referência; indisponível até validação.',false),
('GR200','GR 200',200,'Grupo de referência; indisponível até validação.',false),
('GR250','GR 250',250,'Grupo de referência; indisponível até validação.',false),
('GR300','GR 300',300,'Grupo de referência; indisponível até validação.',false),
('GR400','GR 400',400,'Grupo de referência; indisponível até validação.',false),
('GR500','GR 500',500,'Grupo de referência; indisponível até validação.',false),
('GR700','GR 700',700,'Grupo de referência; indisponível até validação.',false),
('GR800','GR 800',800,'Grupo de referência; indisponível até validação.',false),
('GR1000','GR 1000',1000,'Grupo de referência; indisponível até validação.',false)
on conflict(code) do nothing;

-- Helper security-definer evita recursão nas políticas de profiles.
create or replace function public.has_staff_role()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','support','finance_readonly')); $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'); $$;

-- Não permita que um cliente altere seu próprio papel.
create or replace function public.prevent_self_role_change()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Role changes require an administrator';
  end if;
  return new;
end; $$;
drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change before update on public.profiles
for each row execute function public.prevent_self_role_change();

-- Criar perfil após signup. A senha fica sob gestão do Supabase Auth; não copiá-la para profiles.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into public.profiles(id,full_name,email,phone,cpf)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.email,''),nullif(new.raw_user_meta_data->>'phone',''),nullif(new.raw_user_meta_data->>'cpf',''))
  on conflict(id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.investments enable row level security;
alter table public.payments enable row level security;
alter table public.withdrawals enable row level security;
alter table public.audit_logs enable row level security;
alter table public.investment_groups enable row level security;

drop policy if exists "profile own or admin read" on public.profiles;
create policy "profile own or admin read" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());
drop policy if exists "profile own update" on public.profiles;
create policy "profile own update" on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists "investment owner or staff read" on public.investments;
create policy "investment owner or staff read" on public.investments for select to authenticated
using (user_id = auth.uid() or public.has_staff_role());
drop policy if exists "payment owner or staff read" on public.payments;
create policy "payment owner or staff read" on public.payments for select to authenticated
using (user_id = auth.uid() or public.has_staff_role());
drop policy if exists "withdrawal owner or staff read" on public.withdrawals;
create policy "withdrawal owner or staff read" on public.withdrawals for select to authenticated
using (user_id = auth.uid() or public.has_staff_role());
drop policy if exists "client create own withdrawal request" on public.withdrawals;
create policy "client create own withdrawal request" on public.withdrawals for insert to authenticated
with check (user_id = auth.uid() and status = 'requested' and amount > 0);
drop policy if exists "admin update withdrawals" on public.withdrawals;
create policy "admin update withdrawals" on public.withdrawals for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "audit admin read" on public.audit_logs;
create policy "audit admin read" on public.audit_logs for select to authenticated using (public.is_admin());
drop policy if exists "groups public read" on public.investment_groups;
create policy "groups public read" on public.investment_groups for select to anon,authenticated using (true);
drop policy if exists "groups admin manage" on public.investment_groups;
create policy "groups admin manage" on public.investment_groups for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Escritas de investimentos/pagamentos devem vir de backend confiável/webhook validado.
-- Não crie políticas INSERT/UPDATE para usuários comuns nessas tabelas.
-- Não habilite acesso público a documentos, senhas, tokens ou credenciais.

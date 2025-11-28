-- Create role enum
create type public.app_role as enum ('doctor', 'patient', 'pharmacist', 'admin');

-- Create user_roles table
create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    created_at timestamp with time zone default now(),
    unique (user_id, role)
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- Create security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS policies for user_roles
create policy "Users can view their own role"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own role during signup"
on public.user_roles
for insert
to authenticated
with check (auth.uid() = user_id);

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  medical_license_number text,
  specialization text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles RLS policies
create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id);

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, medical_license_number, specialization)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'medical_license_number',
    new.raw_user_meta_data->>'specialization'
  );
  return new;
end;
$$;

-- Trigger to create profile on user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- Trigger for profiles updated_at
create trigger update_profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at_column();
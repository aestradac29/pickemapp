
-- Habilitar extensiones necesarias
create extension if not exists "uuid-ossp";

-- 1. TABLA CONFIG (Admin global settings)
create table config (
  id int primary key default 1,
  active_days jsonb default '[1]',
  closed_days jsonb default '[]',
  playoff_visible_days jsonb default '[1]',
  playoff_closed_days jsonb default '[]',
  playoff_rounds int default 5,
  playoffs_accessible boolean default false,
  fantasy_round int default 1,
  fantasy_locked boolean default false
);
insert into config (id) values (1) on conflict do nothing;

-- 2. TABLA PROFILES (Extiende auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  email text,
  avatar_url text,
  role text default 'user',
  title text,
  frame text,
  banner text,
  badges text[] default '{}',
  equipped_badges text[] default '{}',
  badge_progress jsonb default '{}',
  score_fantasy float default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Trigger para crear perfil automáticamente al registrarse
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, username, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. TABLA TEAMS
create table teams (
  id text primary key,
  name text,
  short_name text,
  region text,
  color text,
  logo text,
  country text
);

-- 4. TABLA PLAYERS
create table players (
  id text primary key,
  name text,
  role text,
  team_id text references teams(id),
  cost int default 250,
  photo text,
  country text,
  price_change int default 0
);

-- 5. TABLA MATCHES
create table matches (
  id text primary key,
  team_a_id text references teams(id),
  team_b_id text references teams(id),
  start_time text,
  stage text, -- GROUPS, PLAYOFFS
  is_completed boolean default false,
  day int,
  winner_id text references teams(id),
  best_of int default 1,
  bracket_stage text, -- winners, losers
  stats jsonb default '{}',
  games jsonb default '[]'
);

-- 6. TABLA PREDICTIONS (Picks)
create table predictions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id),
  match_id text references matches(id),
  predicted_winner_id text references teams(id),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, match_id)
);

-- 7. TABLA FANTASY TEAMS
create table fantasy_teams (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id),
  round int,
  team jsonb default '{}', -- { TOP: {playerId: 'x', cost: 100}, ... }
  captain text,
  score float default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, round)
);

-- 8. TABLA USER RANKINGS (Prediccion de tabla)
create table user_rankings (
  user_id uuid references profiles(id) primary key,
  ranking jsonb default '[]' -- Array de team_ids en orden
);

-- 9. TABLA USER CRYSTAL BALL
create table user_crystal_ball (
  user_id uuid references profiles(id) primary key,
  selections jsonb default '{}'
);

-- 10. TABLA RESULTS (Resultados oficiales admin para Ranking y Crystal Ball)
create table results (
  id text primary key, -- ej: 'winter_2026'
  ranking jsonb default '[]',
  crystal_ball jsonb default '{}'
);

-- POLÍTICAS RLS (Row Level Security) - Básico para empezar
-- Permitir lectura pública a todo, escritura solo a authenticated para sus propias filas
alter table config enable row level security;
create policy "Public read config" on config for select using (true);
create policy "Admin update config" on config for update using ( auth.uid() in (select id from profiles where role = 'admin') );

alter table profiles enable row level security;
create policy "Public read profiles" on profiles for select using (true);
create policy "User update own profile" on profiles for update using (auth.uid() = id);

alter table teams enable row level security;
create policy "Public read teams" on teams for select using (true);
create policy "Admin update teams" on teams for all using ( auth.uid() in (select id from profiles where role = 'admin') );

alter table players enable row level security;
create policy "Public read players" on players for select using (true);
create policy "Admin update players" on players for all using ( auth.uid() in (select id from profiles where role = 'admin') );

alter table matches enable row level security;
create policy "Public read matches" on matches for select using (true);
create policy "Admin update matches" on matches for all using ( auth.uid() in (select id from profiles where role = 'admin') );

alter table predictions enable row level security;
create policy "Public read predictions" on predictions for select using (true);
create policy "User upsert own predictions" on predictions for insert with check (auth.uid() = user_id);
create policy "User update own predictions" on predictions for update using (auth.uid() = user_id);

alter table fantasy_teams enable row level security;
create policy "Public read fantasy" on fantasy_teams for select using (true);
create policy "User upsert own fantasy" on fantasy_teams for insert with check (auth.uid() = user_id);
create policy "User update own fantasy" on fantasy_teams for update using (auth.uid() = user_id);

alter table user_rankings enable row level security;
create policy "Public read user_rankings" on user_rankings for select using (true);
create policy "User upsert own ranking" on user_rankings for insert with check (auth.uid() = user_id);
create policy "User update own ranking" on user_rankings for update using (auth.uid() = user_id);

alter table user_crystal_ball enable row level security;
create policy "Public read crystal" on user_crystal_ball for select using (true);
create policy "User upsert own crystal" on user_crystal_ball for insert with check (auth.uid() = user_id);
create policy "User update own crystal" on user_crystal_ball for update using (auth.uid() = user_id);

alter table results enable row level security;
create policy "Public read results" on results for select using (true);
create policy "Admin update results" on results for all using ( auth.uid() in (select id from profiles where role = 'admin') );

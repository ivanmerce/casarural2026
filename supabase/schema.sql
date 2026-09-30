-- =====================================================================
-- Cónclave · Esquema Supabase v0.2
-- Postgres + Auth (enlace mágico por email o código personal) + RLS + Realtime
-- Los permisos se aplican AQUÍ, no en la interfaz:
--   admin  : todo, incluidos roles, emails y códigos de acceso
--   editor : edita ingredientes, asignaciones, costes, comidas, actividades y horarios
--   lector : lee todo; solo marca SU asistencia, SU confirmación por día y SUS votos
-- =====================================================================

create type public.member_role as enum ('admin', 'editor', 'lector');
create type public.person_kind as enum ('adulto', 'menor', 'bebe');
create type public.item_status as enum ('pendiente', 'comprado', 'casa');
create type public.split_kind  as enum ('comun', 'propio');
create type public.meal_slot   as enum ('des', 'com', 'mer', 'cen');
create type public.meal_mode   as enum ('comun', 'cada');
create type public.marc_fit    as enum ('si', 'adulto', 'no');

-- ---------- Núcleo ----------
create table public.families (
  id text primary key, name text not null, short text not null, color text not null, note text, sort int not null default 0
);

create table public.people (
  id text primary key,
  family_id text not null references public.families(id),
  name text not null,
  age int, age_approx boolean not null default true,
  kind public.person_kind not null,
  role public.member_role not null default 'lector',
  attends_default boolean not null default true,
  pending boolean not null default false,
  note text,
  email text unique,
  avatar text,                                  -- foto de perfil (data URI WebP de 192 px, ~10 KB)
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- Una persona puede entrar desde varios dispositivos o cuentas (email en el móvil, código en la tablet…)
create table public.person_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  person_id text not null references public.people(id) on delete cascade,
  linked_at timestamptz not null default now()
);

-- Códigos personales de 6 cifras (los genera el admin desde la app). Solo el admin los ve.
create table public.access_codes (
  person_id text primary key references public.people(id) on delete cascade,
  code text not null unique check (code ~ '^[0-9]{6}$'),
  created_at timestamptz not null default now()
);
create table public.code_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  attempts int not null default 0
);

-- Configuración del viaje (nombre, finca, días, horarios, easter eggs, opciones con coste…) en JSON
create table public.app_config (key text primary key, value jsonb not null, updated_at timestamptz not null default now());

create table public.homes (
  id text primary key, name text not null, beds int not null, free int not null default 0, rooms text, note text,
  proposal text[] not null default '{}'
);

create table public.meals (
  id text primary key, day date not null, slot public.meal_slot not null,
  time_override time,
  mode public.meal_mode not null default 'comun',
  title text not null, dishes text[] not null default '{}',
  cook_family_id text references public.families(id),
  marc_menu text, notes text, star boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (day, slot)
);

create table public.meal_attendance (            -- excepciones por comida
  meal_id text references public.meals(id) on delete cascade,
  person_id text references public.people(id) on delete cascade,
  attends boolean not null,
  updated_at timestamptz not null default now(),
  primary key (meal_id, person_id)
);

create table public.day_confirmations (          -- confirmación por persona y día (sin fila = pendiente)
  person_id text references public.people(id) on delete cascade,
  day date not null,
  status text not null check (status in ('si','no')),
  updated_at timestamptz not null default now(),
  primary key (person_id, day)
);

create table public.ingredients (
  id text primary key default gen_random_uuid()::text,
  name text not null, category text not null default 'otros',
  qty numeric not null default 1, unit text not null default 'u', qty_estimated boolean not null default false,
  family_id text references public.families(id),
  status public.item_status not null default 'pendiente',
  split public.split_kind not null default 'comun',
  cost numeric(10,2),                           -- coste real; "viene de casa" = 0
  est_cost numeric(10,2),                       -- ESTIMADO
  per_diners int,                               -- cantidad pensada para N comensales
  suggested boolean not null default false,     -- no estaba en la hoja
  note text, sort int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.ingredient_meals (
  ingredient_id text references public.ingredients(id) on delete cascade,
  meal_id text references public.meals(id) on delete cascade,
  primary key (ingredient_id, meal_id)
);

create table public.expenses (
  id text primary key default gen_random_uuid()::text,
  concept text not null,
  amount numeric(10,2) not null check (amount >= 0),
  payer_family_id text not null references public.families(id),
  split public.split_kind not null default 'comun',
  kind text not null default 'gasto' check (kind in ('gasto','aportacion')),   -- aportación = regalo al bote
  spent_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.activities (
  id text primary key default gen_random_uuid()::text,
  day date not null, start_time time not null, duration_min int not null default 60,
  title text not null, place text not null default 'finca',
  where_text text, travel text, age text,
  marc public.marc_fit not null default 'si',
  owner_person_id text references public.people(id) on delete set null,
  plan_b text, description text,
  star boolean not null default false, is_tournament boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.activity_votes (
  activity_id text references public.activities(id) on delete cascade,
  person_id text references public.people(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (activity_id, person_id)
);

create table public.matches (
  tournament_id text not null default 't1',
  round int not null, slot int not null,
  player_a text references public.people(id), player_b text references public.people(id),
  score_a int, score_b int,
  winner text check (winner in ('a','b')),
  primary key (tournament_id, round, slot)
);

create table public.house_payments (
  id text primary key, label text not null, amount numeric(10,2) not null,
  due_on date, paid_on date, paid boolean not null default false, note text
);

create table public.settings (                   -- una sola fila
  id int primary key default 1 check (id = 1),
  house_total numeric(10,2) not null,
  house_payer_family_id text references public.families(id),
  split_mode text not null default 'ponderado' check (split_mode in ('ponderado','persona','familia')),
  w_adulto numeric not null default 1, w_menor numeric not null default 1, w_bebe numeric not null default 0,
  tax_per_night numeric(10,2) not null default 1.10, tax_nights int not null default 3, tax_min_age int not null default 17,
  tax_payer_family_id text references public.families(id),
  updated_at timestamptz not null default now()
);

-- ---------- Funciones de rol (security definer: leen sin pasar por RLS) ----------
create or replace function public.my_person_id() returns text
language sql stable security definer set search_path = public as
$$ select person_id from public.person_users where user_id = auth.uid() $$;

create or replace function public.my_role() returns public.member_role
language sql stable security definer set search_path = public as
$$ select p.role from public.people p join public.person_users u on u.person_id = p.id where u.user_id = auth.uid() $$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.person_users where user_id = auth.uid()) $$;

create or replace function public.is_editor() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.my_role() in ('admin','editor'), false) $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.my_role() = 'admin', false) $$;

-- ¿Está este email en la lista? (antes de enviar el enlace, para no mandar correos a desconocidos)
create or replace function public.email_allowed(p_email text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.people where lower(email) = lower(trim(p_email))) $$;

-- Tras entrar con email: vincula la cuenta con su persona
create or replace function public.claim_person() returns text
language plpgsql security definer set search_path = public as
$$
declare pid text;
begin
  if public.my_person_id() is not null then return public.my_person_id(); end if;
  select id into pid from public.people where email is not null and lower(email) = lower(auth.jwt() ->> 'email');
  if pid is null then return null; end if;
  insert into public.person_users (user_id, person_id) values (auth.uid(), pid) on conflict (user_id) do nothing;
  return pid;
end $$;

-- Tras entrar con código (sesión anónima): vincula el dispositivo. Máximo 5 intentos por sesión.
create or replace function public.claim_with_code(p_code text) returns text
language plpgsql security definer set search_path = public as
$$
declare pid text; n int;
begin
  insert into public.code_attempts (user_id, attempts) values (auth.uid(), 1)
    on conflict (user_id) do update set attempts = public.code_attempts.attempts + 1
    returning attempts into n;
  if n > 5 then return null; end if;
  select person_id into pid from public.access_codes where code = p_code;
  if pid is null then return null; end if;
  insert into public.person_users (user_id, person_id) values (auth.uid(), pid)
    on conflict (user_id) do update set person_id = excluded.person_id;
  return pid;
end $$;

revoke all on function public.claim_person() from public, anon;
revoke all on function public.claim_with_code(text) from public, anon;
grant execute on function public.claim_person() to authenticated;
grant execute on function public.claim_with_code(text) to authenticated;
grant execute on function public.email_allowed(text) to anon, authenticated;

-- Solo el admin cambia roles o emails
create or replace function public.guard_people_update() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  if coalesce(auth.role(), '') = 'authenticated' and not public.is_admin() and (new.role is distinct from old.role or new.email is distinct from old.email) then
    raise exception 'Solo el admin gestiona accesos';
  end if;
  return new;
end $$;
create trigger people_guard before update on public.people for each row execute function public.guard_people_update();

create or replace function public.touch() returns trigger language plpgsql set search_path = public as
$$ begin new.updated_at = now(); return new; end $$;
create trigger t_meals before update on public.meals for each row execute function public.touch();
create trigger t_ing   before update on public.ingredients for each row execute function public.touch();
create trigger t_act   before update on public.activities for each row execute function public.touch();
create trigger t_att   before update on public.meal_attendance for each row execute function public.touch();
create trigger t_conf  before update on public.day_confirmations for each row execute function public.touch();
create trigger t_cfg   before update on public.app_config for each row execute function public.touch();

-- ---------- RLS ----------
do $$
declare t text;
begin
  foreach t in array array['families','people','person_users','access_codes','code_attempts','app_config','homes','meals','meal_attendance','day_confirmations','ingredients','ingredient_meals','expenses','activities','activity_votes','matches','house_payments','settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
  -- lectura: cualquier miembro con sesión
  foreach t in array array['families','people','app_config','homes','meals','meal_attendance','day_confirmations','ingredients','ingredient_meals','expenses','activities','activity_votes','matches','house_payments','settings'] loop
    execute format('create policy "leer_miembros" on public.%I for select to authenticated using (public.is_member())', t);
  end loop;
  -- escritura de contenido: editores y admin
  foreach t in array array['meals','ingredients','ingredient_meals','expenses','activities','matches','homes','app_config'] loop
    execute format('create policy "editores_ins" on public.%I for insert to authenticated with check (public.is_editor())', t);
    execute format('create policy "editores_upd" on public.%I for update to authenticated using (public.is_editor()) with check (public.is_editor())', t);
    execute format('create policy "editores_del" on public.%I for delete to authenticated using (public.is_editor())', t);
  end loop;
  -- asistencia y confirmación: editores la de cualquiera (padres por hijos), lectores solo la suya
  foreach t in array array['meal_attendance','day_confirmations'] loop
    execute format('create policy "propia_ins" on public.%I for insert to authenticated with check (public.is_editor() or person_id = public.my_person_id())', t);
    execute format('create policy "propia_upd" on public.%I for update to authenticated using (public.is_editor() or person_id = public.my_person_id()) with check (public.is_editor() or person_id = public.my_person_id())', t);
    execute format('create policy "propia_del" on public.%I for delete to authenticated using (public.is_editor() or person_id = public.my_person_id())', t);
  end loop;
end $$;

create policy "votos_ins" on public.activity_votes for insert to authenticated with check (person_id = public.my_person_id());
create policy "votos_del" on public.activity_votes for delete to authenticated using (person_id = public.my_person_id());

create policy "personas_upd" on public.people for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "personas_ins" on public.people for insert to authenticated with check (public.is_admin());
create policy "personas_del" on public.people for delete to authenticated using (public.is_admin());

create policy "vinculos_propios" on public.person_users for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "vinculos_admin_del" on public.person_users for delete to authenticated using (public.is_admin());
create policy "codigos_admin" on public.access_codes for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "casa_admin" on public.house_payments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "familias_admin" on public.families for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "ajustes_editor" on public.settings for update to authenticated using (public.is_editor()) with check (public.is_editor());

-- ---------- Realtime ----------
alter publication supabase_realtime add table public.meals, public.meal_attendance, public.day_confirmations, public.ingredients,
  public.ingredient_meals, public.expenses, public.activities, public.activity_votes, public.matches, public.people,
  public.settings, public.house_payments, public.app_config;

create index on public.person_users (person_id);
create index on public.ingredients (family_id, status);
create index on public.ingredient_meals (meal_id);
create index on public.activities (day, start_time);
create index on public.activities (owner_person_id);
create index on public.meals (cook_family_id);
create index on public.people (family_id);
create index on public.expenses (payer_family_id);
create index on public.ingredients (family_id);
create index on public.matches (player_a);
create index on public.matches (player_b);
create index on public.activity_votes (person_id);
create index on public.meal_attendance (person_id);

-- ---------- Endurecimiento (advisors de Supabase) ----------
revoke execute on function public.my_person_id(), public.my_role(), public.is_member(), public.is_editor(), public.is_admin() from public, anon;
grant execute on function public.my_person_id(), public.my_role(), public.is_member(), public.is_editor(), public.is_admin() to authenticated;
revoke execute on function public.guard_people_update() from public, anon, authenticated;
revoke execute on function public.touch() from public, anon, authenticated;
comment on table public.code_attempts is 'Solo accesible desde claim_with_code (security definer). Sin políticas a propósito.';

-- ---------- Presencia: última vez visto (el "conectado ahora" va por Realtime Presence) ----------
create table public.presence (
  person_id text primary key references public.people(id) on delete cascade,
  last_seen timestamptz not null default now(),
  visits int not null default 1
);
alter table public.presence enable row level security;
revoke all on public.presence from anon;
grant select on public.presence to authenticated;
create policy "leer_miembros" on public.presence for select to authenticated using (public.is_member());
alter table public.presence add column if not exists minutes int not null default 0;
alter table public.presence add column if not exists eggs int not null default 0;
create or replace function public.ping(p_eggs int default null) returns timestamptz
language plpgsql security definer set search_path = public as
$$
declare pid text := public.my_person_id();
begin
  if pid is null then return null; end if;
  insert into public.presence (person_id, last_seen, eggs) values (pid, now(), coalesce(least(greatest(p_eggs, 0), 99), 0))
    on conflict (person_id) do update set
      visits = public.presence.visits + case when public.presence.last_seen < now() - interval '30 minutes' then 1 else 0 end,
      minutes = public.presence.minutes + case when public.presence.last_seen < now() - interval '50 seconds' and public.presence.last_seen > now() - interval '5 minutes' then 1 else 0 end,
      eggs = greatest(public.presence.eggs, coalesce(least(greatest(p_eggs, 0), 99), 0)),
      last_seen = now();
  return now();
end $$;
revoke all on function public.ping(int) from public, anon;
grant execute on function public.ping(int) to authenticated;


-- ---------- v0.4: juegos, competición y premios ----------
create table public.games (id text primary key, data jsonb not null, sort int not null default 0, updated_at timestamptz not null default now());
create table public.awards (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table public.award_votes (
  award_id text not null, voter_id text not null references public.people(id) on delete cascade, nominee text not null,
  created_at timestamptz not null default now(), primary key (award_id, voter_id)
);
create index on public.award_votes (voter_id);
create trigger t_games before update on public.games for each row execute function public.touch();
create trigger t_awards before update on public.awards for each row execute function public.touch();
do $$
declare t text;
begin
  foreach t in array array['games','awards','award_votes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "leer_miembros" on public.%I for select to authenticated using (public.is_member())', t);
  end loop;
  foreach t in array array['games','awards'] loop
    execute format('create policy "editores_ins" on public.%I for insert to authenticated with check (public.is_editor())', t);
    execute format('create policy "editores_upd" on public.%I for update to authenticated using (public.is_editor()) with check (public.is_editor())', t);
    execute format('create policy "editores_del" on public.%I for delete to authenticated using (public.is_editor())', t);
  end loop;
end $$;
create policy "voto_ins" on public.award_votes for insert to authenticated with check (voter_id = public.my_person_id());
create policy "voto_upd" on public.award_votes for update to authenticated using (voter_id = public.my_person_id()) with check (voter_id = public.my_person_id());
create policy "voto_del" on public.award_votes for delete to authenticated using (voter_id = public.my_person_id());
alter publication supabase_realtime add table public.games, public.awards, public.award_votes;

-- ---------- v0.4: los adultos confirman la asistencia de toda su familia ----------
create or replace function public.can_attend_for(p_person text) returns boolean
language sql stable security definer set search_path = public as
$$
  select public.is_editor() or p_person = public.my_person_id()
      or exists (select 1 from public.people me join public.people t on t.family_id = me.family_id
                 where me.id = public.my_person_id() and me.kind = 'adulto' and t.id = p_person);
$$;
revoke all on function public.can_attend_for(text) from public, anon;
grant execute on function public.can_attend_for(text) to authenticated;
do $$
declare t text;
begin
  foreach t in array array['meal_attendance','day_confirmations'] loop
    execute format('drop policy if exists "propia_ins" on public.%I', t);
    execute format('drop policy if exists "propia_upd" on public.%I', t);
    execute format('drop policy if exists "propia_del" on public.%I', t);
    execute format('create policy "propia_ins" on public.%I for insert to authenticated with check (public.can_attend_for(person_id))', t);
    execute format('create policy "propia_upd" on public.%I for update to authenticated using (public.can_attend_for(person_id)) with check (public.can_attend_for(person_id))', t);
    execute format('create policy "propia_del" on public.%I for delete to authenticated using (public.can_attend_for(person_id))', t);
  end loop;
end $$;

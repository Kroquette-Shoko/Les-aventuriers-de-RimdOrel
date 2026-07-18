-- ============================================================
-- SPELLCRAFT — Addendum 4 au schéma Supabase : multijoueur
-- ============================================================
-- À exécuter APRÈS tous les addendums précédents (SQL Editor → Run).
--
-- Une "room" (salle) représente une invitation à jouer : un joueur la
-- crée (hôte), partage son lien, un ami la rejoint (invité). Le
-- déroulement de la partie elle-même (coups joués) ne passe PAS par
-- cette table — elle utilise Supabase Realtime "Broadcast" (canal
-- éphémère, rien n'est stocké en base pour chaque coup). Cette table
-- ne sert qu'à la mise en relation et au résultat final.
-- ============================================================

create table public.game_rooms (
  id uuid default gen_random_uuid() primary key,
  host_id uuid references auth.users(id) on delete cascade not null,
  guest_id uuid references auth.users(id) on delete cascade,
  host_deck jsonb,
  guest_deck jsonb,
  status text not null default 'waiting', -- waiting | active | finished | abandoned
  winner text, -- 'host' | 'guest' | null
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.game_rooms enable row level security;

-- Lecture : l'hôte, l'invité, ou toute personne connaissant l'id (= le lien
-- d'invitation lui-même fait office de secret) peuvent lire la salle.
create policy "salle visible par qui a le lien" on public.game_rooms
  for select using (true);

-- Création : seul un utilisateur connecté peut créer une salle, et seulement en tant qu'hôte
create policy "un utilisateur crée sa propre salle" on public.game_rooms
  for insert with check (auth.uid() = host_id);

-- Modification : l'hôte peut toujours modifier sa salle ; n'importe quel autre
-- utilisateur connecté peut la modifier UNIQUEMENT pour la rejoindre en tant
-- qu'invité (si personne ne l'a encore rejointe).
create policy "hôte modifie sa salle" on public.game_rooms
  for update using (auth.uid() = host_id);

create policy "un joueur rejoint une salle libre" on public.game_rooms
  for update using (guest_id is null and auth.uid() != host_id)
  with check (guest_id = auth.uid());

create index game_rooms_status_idx on public.game_rooms(status);

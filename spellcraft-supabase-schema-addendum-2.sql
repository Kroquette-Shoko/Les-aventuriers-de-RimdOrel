-- ============================================================
-- SPELLCRAFT — Addendum 2 au schéma Supabase
-- ============================================================
-- À exécuter APRÈS spellcraft-supabase-schema.sql ET
-- spellcraft-supabase-schema-addendum.sql (SQL Editor → New query → Run).
--
-- Système temporaire de collection : tant qu'il n'existe pas de vrai
-- système d'acquisition (paquets, récompenses...), chaque compte
-- possède automatiquement tout le catalogue existant. Deux
-- déclencheurs s'en chargent :
--
-- 1. À la création d'un compte : il reçoit un exemplaire de chaque
--    carte déjà dans le catalogue (2 exemplaires, ou 1 pour les
--    Légendaires, comme les règles de deckbuilding habituelles).
-- 2. À l'ajout d'une nouvelle carte au catalogue : elle est distribuée
--    à tous les comptes déjà existants.
--
-- Pour retirer ce système plus tard (une fois un vrai système
-- d'acquisition en place), il suffira de supprimer ces deux
-- déclencheurs (DROP TRIGGER) sans toucher au reste du schéma.
-- ============================================================

create or replace function public.grant_full_catalog_to_user(target_user_id uuid)
returns void as $$
begin
  insert into public.user_cards (user_id, card_id, quantity)
  select target_user_id, c.id,
    case when (c.data->>'rarity') = 'Légendaire' then 1 else 2 end
  from public.cards c
  on conflict (user_id, card_id) do nothing;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.handle_new_profile_grant_catalog()
returns trigger as $$
begin
  perform public.grant_full_catalog_to_user(new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_profile_created_grant_catalog on public.profiles;
create trigger on_profile_created_grant_catalog
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile_grant_catalog();

create or replace function public.handle_new_card_grant_to_all()
returns trigger as $$
begin
  insert into public.user_cards (user_id, card_id, quantity)
  select p.id, new.id,
    case when (new.data->>'rarity') = 'Légendaire' then 1 else 2 end
  from public.profiles p
  on conflict (user_id, card_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_card_created_grant_to_all on public.cards;
create trigger on_card_created_grant_to_all
  after insert on public.cards
  for each row execute procedure public.handle_new_card_grant_to_all();

-- Rattrapage pour les comptes déjà créés avant ce script : leur donne
-- aussi tout le catalogue actuel, une fois, maintenant.
do $$
declare p record;
begin
  for p in select id from public.profiles loop
    perform public.grant_full_catalog_to_user(p.id);
  end loop;
end $$;

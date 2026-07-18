-- ============================================================
-- SPELLCRAFT — Addendum 3 au schéma Supabase
-- ============================================================
-- À exécuter APRÈS les addendums 1 et 2 (SQL Editor → New query → Run).
--
-- Remplace la règle "tout le catalogue est offert à tous les comptes"
-- par une règle plus fine : seuls les sets marqués comme "set de base"
-- (is_base = true) sont automatiquement donnés à tous les comptes.
-- Les autres sets (futures extensions) ne le seront pas — libre à toi
-- de construire plus tard un vrai système d'acquisition pour eux
-- (paquets, récompenses...).
-- ============================================================

alter table public.card_sets add column if not exists is_base boolean not null default false;

-- Marque automatiquement un set existant nommé "Édition de base" comme set de base,
-- si tu en as déjà un (sinon coche-le manuellement depuis l'éditeur).
update public.card_sets set is_base = true where name = 'Édition de base';

-- Donne toutes les cartes des sets de base à un utilisateur donné
create or replace function public.grant_full_catalog_to_user(target_user_id uuid)
returns void as $$
begin
  insert into public.user_cards (user_id, card_id, quantity)
  select target_user_id, c.id,
    case when (c.data->>'rarity') = 'Légendaire' then 1 else 2 end
  from public.cards c
  join public.card_sets s on s.id = c.set_id
  where s.is_base = true
  on conflict (user_id, card_id) do nothing;
end;
$$ language plpgsql security definer set search_path = public;

-- À l'ajout d'une carte : ne la distribue à tous que si son set est un set de base
create or replace function public.handle_new_card_grant_to_all()
returns trigger as $$
begin
  if exists (select 1 from public.card_sets where id = new.set_id and is_base = true) then
    insert into public.user_cards (user_id, card_id, quantity)
    select p.id, new.id,
      case when (new.data->>'rarity') = 'Légendaire' then 1 else 2 end
    from public.profiles p
    on conflict (user_id, card_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Distribue tout un set (toutes ses cartes) à tous les comptes existants —
-- utile quand tu marques après coup un set comme "de base" depuis l'éditeur.
create or replace function public.grant_set_to_all_users(target_set_id text)
returns void as $$
begin
  insert into public.user_cards (user_id, card_id, quantity)
  select p.id, c.id,
    case when (c.data->>'rarity') = 'Légendaire' then 1 else 2 end
  from public.profiles p
  cross join public.cards c
  where c.set_id = target_set_id
  on conflict (user_id, card_id) do nothing;
end;
$$ language plpgsql security definer set search_path = public;

-- Autorise les utilisateurs connectés à appeler cette fonction depuis le client
grant execute on function public.grant_set_to_all_users(text) to authenticated;

-- Rattrapage : donne tout de suite les sets de base actuels à tous les comptes existants
do $$
declare p record;
begin
  for p in select id from public.profiles loop
    perform public.grant_full_catalog_to_user(p.id);
  end loop;
end $$;

-- ============================================================
-- SPELLCRAFT — Addendum au schéma Supabase
-- ============================================================
-- À exécuter APRÈS spellcraft-supabase-schema.sql, de la même façon
-- (SQL Editor → New query → coller → Run).
--
-- Pourquoi ce fichier séparé : la création du profil (nom d'utilisateur)
-- ne peut pas se faire de façon fiable depuis le navigateur juste après
-- l'inscription, si ton projet exige la confirmation par email (réglage
-- par défaut de Supabase) — l'utilisateur n'a pas encore de session
-- active à ce moment-là, donc les règles de sécurité (RLS) bloqueraient
-- l'insertion silencieusement.
--
-- La solution standard : un déclencheur côté base de données, qui
-- s'exécute automatiquement à la création de CHAQUE compte (confirmé
-- ou non), avec des droits élevés qui n'ont pas ce problème.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

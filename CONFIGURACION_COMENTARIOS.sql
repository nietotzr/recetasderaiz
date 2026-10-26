-- Ejecutar en Supabase SQL Editor. Activar moderación: solo approved=true es visible.
create table if not exists public.recipe_reviews (
 id bigint generated always as identity primary key,
 recipe_slug text not null check (length(recipe_slug) between 1 and 120),
 name text not null check (length(name) between 2 and 60),
 rating integer not null check (rating between 1 and 5),
 comment text not null check (length(comment) between 10 and 1500),
 approved boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists recipe_reviews_public_idx on public.recipe_reviews(recipe_slug,created_at desc) where approved=true;
alter table public.recipe_reviews enable row level security;
revoke all on public.recipe_reviews from anon,authenticated;
grant select (recipe_slug,name,rating,comment,created_at,approved) on public.recipe_reviews to anon;
grant insert (recipe_slug,name,rating,comment) on public.recipe_reviews to anon;
create policy "read approved reviews" on public.recipe_reviews for select to anon using (approved=true);
create policy "submit pending reviews" on public.recipe_reviews for insert to anon with check (approved=false);
-- Para aprobar, cambiar approved a true desde Table Editor con cuenta administradora.
-- Importante: configurar CAPTCHA / limitación de peticiones antes de abrir el formulario al público.

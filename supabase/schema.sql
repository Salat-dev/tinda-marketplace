-- =================================================================
--  Tinda · Schéma Supabase complet
--  À exécuter dans SQL Editor d'un nouveau projet Supabase
-- =================================================================

-- ============ EXTENSIONS ============
create extension if not exists "uuid-ossp";

-- =================================================================
--  TABLES
-- =================================================================

-- ============ VENDORS ============
create table if not exists vendors (
  id             uuid primary key default uuid_generate_v4(),
  auth_user_id   uuid unique references auth.users(id) on delete cascade,
  shop_name      text not null,
  phone          text not null,
  whatsapp       text,
  city           text,
  country        text default 'CM',
  created_at     timestamptz default now()
);

-- ============ CATEGORIES ============
create table if not exists categories (
  id           uuid primary key default uuid_generate_v4(),
  vendor_id    uuid references vendors(id) on delete cascade,
  name         text not null,
  slug         text not null,
  icon         text,
  position     int default 0,
  created_at   timestamptz default now(),
  unique (vendor_id, slug)
);
create index if not exists idx_categories_vendor on categories(vendor_id);

-- ============ PRODUCTS ============
create table if not exists products (
  id            uuid primary key default uuid_generate_v4(),
  vendor_id     uuid not null references vendors(id) on delete cascade,
  category_id   uuid references categories(id) on delete set null,
  name          text not null,
  description   text not null,
  price         integer not null check (price >= 0),
  old_price     integer check (old_price is null or old_price >= 0),
  stock         integer not null default 0 check (stock >= 0),
  image_url     text not null,
  images        text[] default '{}',
  colors        jsonb default '[]'::jsonb,
  badge         text check (badge in ('new','bestseller','featured','unlimited','out_of_stock','promo','limited')) default null,
  active        boolean default true,
  created_at    timestamptz default now()
);
create index if not exists idx_products_vendor   on products(vendor_id);
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_active   on products(active) where active = true;

-- ============ ORDERS ============
create table if not exists orders (
  id                uuid primary key default uuid_generate_v4(),
  order_number      text unique not null,
  vendor_id         uuid not null references vendors(id) on delete cascade,
  customer_name     text not null,
  customer_phone    text not null,
  customer_address  text not null,
  customer_city     text,
  total             integer not null check (total >= 0),
  status            text not null default 'pending' check (status in ('pending','accepted','rejected')),
  notes             text,
  created_at        timestamptz default now()
);
create index if not exists idx_orders_vendor on orders(vendor_id);
create index if not exists idx_orders_status on orders(status);

-- ============ ORDER_ITEMS ============
create table if not exists order_items (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  name        text not null,
  unit_price  integer not null,
  quantity    integer not null check (quantity > 0),
  subtotal    integer not null
);
create index if not exists idx_order_items_order on order_items(order_id);

-- =================================================================
--  TRIGGER : auto-créer un vendor à chaque signup Supabase Auth
-- =================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.vendors (auth_user_id, shop_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'shop_name', 'Ma boutique'),
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =================================================================
--  ROW LEVEL SECURITY
-- =================================================================
alter table vendors     enable row level security;
alter table categories  enable row level security;
alter table products    enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;

-- ---------- VENDORS ----------
drop policy if exists "vendors_read" on vendors;
create policy "vendors_read" on vendors
  for select to anon, authenticated using (true);

drop policy if exists "vendors_update_own" on vendors;
create policy "vendors_update_own" on vendors
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- ---------- CATEGORIES ----------
drop policy if exists "cat_read" on categories;
create policy "cat_read" on categories
  for select to anon, authenticated using (true);

drop policy if exists "cat_vendor_insert" on categories;
create policy "cat_vendor_insert" on categories
  for insert to authenticated
  with check (vendor_id in (select id from vendors where auth_user_id = auth.uid()));

drop policy if exists "cat_vendor_update" on categories;
create policy "cat_vendor_update" on categories
  for update to authenticated
  using (vendor_id in (select id from vendors where auth_user_id = auth.uid()));

drop policy if exists "cat_vendor_delete" on categories;
create policy "cat_vendor_delete" on categories
  for delete to authenticated
  using (vendor_id in (select id from vendors where auth_user_id = auth.uid()));

-- ---------- PRODUCTS ----------
-- Lecture publique des produits actifs
drop policy if exists "prod_public_read" on products;
create policy "prod_public_read" on products
  for select to anon, authenticated using (active = true);

-- Un vendeur voit tous ses produits (actifs ou non)
drop policy if exists "prod_vendor_read_all" on products;
create policy "prod_vendor_read_all" on products
  for select to authenticated
  using (vendor_id in (select id from vendors where auth_user_id = auth.uid()));

drop policy if exists "prod_vendor_insert" on products;
create policy "prod_vendor_insert" on products
  for insert to authenticated
  with check (vendor_id in (select id from vendors where auth_user_id = auth.uid()));

drop policy if exists "prod_vendor_update" on products;
create policy "prod_vendor_update" on products
  for update to authenticated
  using (vendor_id in (select id from vendors where auth_user_id = auth.uid()));

drop policy if exists "prod_vendor_delete" on products;
create policy "prod_vendor_delete" on products
  for delete to authenticated
  using (vendor_id in (select id from vendors where auth_user_id = auth.uid()));

-- ---------- ORDERS ----------
<<<<<<< HEAD
-- Création publique (clients non authentifiés)
drop policy if exists "order_insert_public" on orders;
create policy "order_insert_public" on orders
  for insert to anon, authenticated with check (true);
=======
-- Création publique (clients non authentifiés, clé publishable incluse)
drop policy if exists "order_insert_public" on orders;
create policy "order_insert_public" on orders
  for insert to public with check (true);
>>>>>>> 325314a (Initial commit)

-- Lecture réservée au vendeur propriétaire
drop policy if exists "order_vendor_read" on orders;
create policy "order_vendor_read" on orders
  for select to authenticated
  using (vendor_id in (select id from vendors where auth_user_id = auth.uid()));

-- Update (statut) réservée au vendeur
drop policy if exists "order_vendor_update" on orders;
create policy "order_vendor_update" on orders
  for update to authenticated
  using (vendor_id in (select id from vendors where auth_user_id = auth.uid()));

-- ---------- ORDER ITEMS ----------
drop policy if exists "oi_insert_public" on order_items;
create policy "oi_insert_public" on order_items
<<<<<<< HEAD
  for insert to anon, authenticated with check (true);
=======
  for insert to public with check (true);
>>>>>>> 325314a (Initial commit)

drop policy if exists "oi_vendor_read" on order_items;
create policy "oi_vendor_read" on order_items
  for select to authenticated
  using (order_id in (
    select o.id from orders o
    join vendors v on v.id = o.vendor_id
    where v.auth_user_id = auth.uid()
  ));

-- =================================================================
--  STORAGE : bucket public "product-images"
-- =================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Lecture publique
drop policy if exists "img_public_read" on storage.objects;
create policy "img_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

-- Upload : chaque vendeur écrit dans son sous-dossier {auth.uid}/
drop policy if exists "img_vendor_insert" on storage.objects;
create policy "img_vendor_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "img_vendor_update" on storage.objects;
create policy "img_vendor_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "img_vendor_delete" on storage.objects;
create policy "img_vendor_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =================================================================
--  REALTIME : activer pour les orders (dashboard vendeur)
-- =================================================================
-- Si cette commande échoue avec "already added", c'est OK, ignore
do $$
begin
  alter publication supabase_realtime add table orders;
exception
  when duplicate_object then null;
  when others then null;
end $$;

-- =================================================================
--  FIN DU SCRIPT
-- =================================================================
-- Étapes suivantes :
-- 1. Dashboard → Authentication → Providers → Email → désactive "Confirm email"
--    (pour que l'inscription marque directement l'utilisateur comme confirmé)
-- 2. Dashboard → Project Settings → API Keys → copie la Publishable key
-- 3. Colle-la dans js/supabase.js (ligne SUPABASE_PUBLISHABLE_KEY)

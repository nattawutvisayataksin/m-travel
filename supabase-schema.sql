-- ============================================================
-- M-Travel — สคริปต์ตั้งค่าฐานข้อมูล Supabase
-- ------------------------------------------------------------
-- วิธีใช้:
--   1) เข้าโปรเจกต์ Supabase ของคุณ → เมนู "SQL Editor" → New query
--   2) ✓ อีเมลผู้ดูแลใส่ไว้เรียบร้อยแล้ว: nattawutvisayataksin@gmail.com
--      (อยากเปลี่ยนอีเมลภายหลัง แก้บรรทัด insert ด้านล่างได้)
--   3) กด Run  (รันได้ซ้ำได้ ไม่ทำให้ข้อมูลเดิมเสียหาย)
-- ============================================================

-- ---------- ตารางทริปท่องเที่ยว ----------
create table if not exists public.trips (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  country     text not null default '',
  location    text not null default '',
  start_date  date,
  end_date    date,
  summary     text not null default '',
  content     text not null default '',
  highlights  text[] not null default '{}',
  cover_url   text not null default '',
  photos      jsonb not null default '[]',   -- [{url, caption}, ...]
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- ตารางตั้งค่าเว็บ (แถวเดียว id = 1) ----------
create table if not exists public.site_settings (
  id          int primary key default 1 check (id = 1),
  site_title  text not null default 'M-Travel',
  tagline     text not null default 'บันทึกการเดินทางของฉัน',
  hero_url    text not null default '',
  about_text  text not null default '',
  updated_at  timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- ---------- ตารางอีเมลผู้ดูแล ----------
-- ✓ อีเมลผู้ดูแล: nattawutvisayataksin@gmail.com (แก้ได้ภายหลัง)
create table if not exists public.admins (
  email text primary key
);
insert into public.admins (email) values ('nattawutvisayataksin@gmail.com')
  on conflict (email) do nothing;

-- เพิ่มอีเมลผู้ดูแลเพิ่มภายหลังได้ด้วยคำสั่ง:
-- insert into public.admins (email) values ('อีเมลใหม่@example.com');

-- ---------- ฟังก์ชันตรวจสิทธิ์ผู้ดูแล ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where email = coalesce(auth.email(), '')
  );
$$;

-- ---------- เปิด Row Level Security ----------
alter table public.trips enable row level security;
alter table public.site_settings enable row level security;
alter table public.admins enable row level security;  -- ไม่ให้ policy ใด ๆ = อ่านได้เฉพาะ service role

-- ---------- Policies: ทริป ----------
-- ทุกคนอ่านได้เฉพาะทริปที่เผยแพร่ / ผู้ดูแลอ่านได้ทั้งหมด (รวมฉบับร่าง)
drop policy if exists "public read published trips" on public.trips;
create policy "public read published trips"
  on public.trips for select
  using (is_public = true or public.is_admin());

drop policy if exists "admin insert trips" on public.trips;
create policy "admin insert trips"
  on public.trips for insert
  with check (public.is_admin());

drop policy if exists "admin update trips" on public.trips;
create policy "admin update trips"
  on public.trips for update
  using (public.is_admin());

drop policy if exists "admin delete trips" on public.trips;
create policy "admin delete trips"
  on public.trips for delete
  using (public.is_admin());

-- ---------- Policies: ตั้งค่าเว็บ ----------
drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings"
  on public.site_settings for select
  using (true);

drop policy if exists "admin insert settings" on public.site_settings;
create policy "admin insert settings"
  on public.site_settings for insert
  with check (public.is_admin());

drop policy if exists "admin update settings" on public.site_settings;
create policy "admin update settings"
  on public.site_settings for update
  using (public.is_admin());

-- ---------- อัปเดต updated_at อัตโนมัติ ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_touch_updated_at on public.trips;
create trigger trips_touch_updated_at
  before update on public.trips
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch_updated_at on public.site_settings;
create trigger settings_touch_updated_at
  before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- ---------- Storage: bucket เก็บรูปถ่าย ----------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "public read photos" on storage.objects;
create policy "public read photos"
  on storage.objects for select
  using (bucket_id = 'photos');

drop policy if exists "admin upload photos" on storage.objects;
create policy "admin upload photos"
  on storage.objects for insert
  with check (bucket_id = 'photos' and public.is_admin());

drop policy if exists "admin update photos" on storage.objects;
create policy "admin update photos"
  on storage.objects for update
  using (bucket_id = 'photos' and public.is_admin());

drop policy if exists "admin delete photos" on storage.objects;
create policy "admin delete photos"
  on storage.objects for delete
  using (bucket_id = 'photos' and public.is_admin());

-- ============================================================
-- เสร็จแล้ว! ขั้นตอนถัดไป:
--   1) เปิดใช้ Email login: Authentication → Sign In / Up → Email
--   2) คัดลอก Project URL + anon public key (Settings → API)
--      ไปใส่ในไฟล์ assets/js/config.js
--   3) Deploy เว็บ แล้วเข้าหน้า /admin.html สมัครบัญชีด้วยอีเมล
--      ที่ใส่ไว้ในตาราง admins
-- ============================================================

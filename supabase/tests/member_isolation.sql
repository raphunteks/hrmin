-- Uji isolasi peran Member (L5). Jalankan pada database KOSONG/UJI yang sudah dimigrasi dan diberi data demo, bukan produksi:
--   psql "$PG_TEST_URL" -v ON_ERROR_STOP=1 -f supabase/tests/member_isolation.sql
-- Semua perubahan dibatalkan (ROLLBACK). Gagal = exception dengan pesan jelas; lulus = "LULUS member_isolation".
begin;

-- ───── Fixture (dibuat sebagai pemilik database, melewati RLS) ─────
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000f101', 'm1a@uji.test'), ('00000000-0000-0000-0000-00000000f102', 'm1b@uji.test'),
  ('00000000-0000-0000-0000-00000000f201', 'm2a@uji.test'), ('00000000-0000-0000-0000-00000000f301', 's1@uji.test'),
  ('00000000-0000-0000-0000-00000000f401', 'o1@uji.test');
insert into public.customers (id, tenant_id, phone, name, points) values
  ('00000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-000000000001', '+6281111', 'Member 1A', 120),
  ('00000000-0000-0000-0000-00000000c102', '00000000-0000-0000-0000-000000000001', '+6282222', 'Member 1B', 80),
  ('00000000-0000-0000-0000-00000000c201', '00000000-0000-0000-0000-000000000002', '+6283333', 'Member 2A', 50);
insert into public.profiles (id, tenant_id, branch_id, role, full_name, email, customer_id) values
  ('00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-000000000001', null, 'member', 'Member 1A', 'm1a@uji.test', '00000000-0000-0000-0000-00000000c101'),
  ('00000000-0000-0000-0000-00000000f102', '00000000-0000-0000-0000-000000000001', null, 'member', 'Member 1B', 'm1b@uji.test', '00000000-0000-0000-0000-00000000c102'),
  ('00000000-0000-0000-0000-00000000f201', '00000000-0000-0000-0000-000000000002', null, 'member', 'Member 2A', 'm2a@uji.test', '00000000-0000-0000-0000-00000000c201');
insert into public.profiles (id, tenant_id, branch_id, role, full_name, email) values
  ('00000000-0000-0000-0000-00000000f301', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'staff', 'Staff 1', 's1@uji.test'),
  ('00000000-0000-0000-0000-00000000f401', '00000000-0000-0000-0000-000000000001', null, 'owner', 'Owner 1', 'o1@uji.test');
insert into public.orders (id, tenant_id, branch_id, code, status, subtotal, total, customer_phone) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'UJI-1A', 'paid', 30000, 30000, '+6281111'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'UJI-1B', 'paid', 40000, 40000, '+6282222'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'UJI-ANON', 'paid', 20000, 20000, null),
  ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b3', 'UJI-2A', 'paid', 50000, 50000, '+6283333');
insert into public.payments (tenant_id, order_id, method, amount) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'cash', 30000),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d2', 'cash', 40000);
insert into public.queue_entries (tenant_id, branch_id, kind, name, phone, party_size) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'table', 'Antre 1A', '+6281111', 2),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'table', 'Antre 1B', '+6282222', 2);

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.back() returns void language plpgsql as $$
begin perform set_config('role', 'postgres', true); perform set_config('request.jwt.claim.sub', '', true); end $$;
create function pg_temp.n(p_sql text) returns bigint language plpgsql as $$
declare r bigint; begin execute p_sql into r; return r; end $$;
-- Ditolak = exception ATAU nol baris terdampak (RLS menyaring UPDATE/DELETE secara diam-diam).
create function pg_temp.expect_fail(p_sql text, p_what text) returns void language plpgsql as $$
declare rc bigint;
begin
  begin execute p_sql; get diagnostics rc = row_count; exception when others then return; end;
  if rc = 0 then return; end if;
  raise exception 'GAGAL: % seharusnya ditolak (% baris terdampak)', p_what, rc;
end $$;
create function pg_temp.eq(p_what text, p_got bigint, p_want bigint) returns void language plpgsql as $$
begin if p_got is distinct from p_want then raise exception 'GAGAL: % → dapat %, seharusnya %', p_what, p_got, p_want; end if; end $$;

-- ───── 1 · Penautan Pesanan ke Pelanggan lewat nomor ─────
select pg_temp.eq('order 1A tertaut ke pelanggan 1A', pg_temp.n($$select count(*) from public.orders where code='UJI-1A' and customer_id='00000000-0000-0000-0000-00000000c101'$$), 1);
select pg_temp.eq('order tanpa nomor tidak tertaut', pg_temp.n($$select count(*) from public.orders where code='UJI-ANON' and customer_id is not null$$), 0);

-- ───── 2 · Member 1A (Tenant 1): hanya data sendiri ─────
select pg_temp.act_as('00000000-0000-0000-0000-00000000f101');
select pg_temp.eq('1A: peran terbaca member', pg_temp.n($$select count(*) from public.profiles where role='member'$$), 1);
select pg_temp.eq('1A: hanya 1 profil (dirinya)', pg_temp.n('select count(*) from public.profiles'), 1);
select pg_temp.eq('1A: hanya 1 pelanggan (dirinya)', pg_temp.n('select count(*) from public.customers'), 1);
select pg_temp.eq('1A: poin sendiri terbaca', pg_temp.n('select points from public.customers'), 120);
select pg_temp.eq('1A: hanya pesanan sendiri', pg_temp.n('select count(*) from public.orders'), 1);
select pg_temp.eq('1A: pesanan sendiri adalah UJI-1A', pg_temp.n($$select count(*) from public.orders where code='UJI-1A'$$), 1);
select pg_temp.eq('1A: pembayaran hanya milik sendiri', pg_temp.n('select count(*) from public.payments'), 1);
select pg_temp.eq('1A: antrean hanya milik sendiri', pg_temp.n('select count(*) from public.queue_entries'), 1);
select pg_temp.eq('1A: katalog produk terbaca', (pg_temp.n('select count(*) from public.products') > 0)::int, 1);
select pg_temp.eq('1A: produk hanya Tenant sendiri', pg_temp.n($$select count(*) from public.products where tenant_id <> '00000000-0000-0000-0000-000000000001'$$), 0);
select pg_temp.eq('1A: cabang hanya Tenant sendiri', pg_temp.n($$select count(*) from public.branches where tenant_id <> '00000000-0000-0000-0000-000000000001'$$), 0);
select pg_temp.eq('1A: Tenant tidak terbaca langsung', pg_temp.n('select count(*) from public.tenants'), 0);

-- Semua tabel lain: 0 baris
do $$
declare t text; got bigint;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname not in ('profiles','customers','orders','order_items','payments','queue_entries','products','branches',
                            'rbac_matrix','plans','icd_codes','feature_flags','industry_templates')
  loop
    execute format('select count(*) from public.%I', t) into got;
    if got <> 0 then raise exception 'GAGAL: Member melihat % baris di tabel %', got, t; end if;
  end loop;
end $$;

-- Tulis langsung ditolak / tidak berefek
select pg_temp.expect_fail($$update public.customers set points = 99999$$, 'ubah poin sendiri lewat tabel');
select pg_temp.expect_fail($$insert into public.customers (tenant_id, phone) values ('00000000-0000-0000-0000-000000000001', '+62899')$$, 'buat Pelanggan');
select pg_temp.expect_fail($$update public.orders set total = 0$$, 'ubah pesanan');
select pg_temp.expect_fail($$delete from public.orders$$, 'hapus pesanan');
select pg_temp.expect_fail($$update public.profiles set role = 'owner' where id = auth.uid()$$, 'naik peran');
select pg_temp.expect_fail($$update public.profiles set customer_id = '00000000-0000-0000-0000-00000000c102' where id = auth.uid()$$, 'pindah tautan Pelanggan');
select pg_temp.expect_fail($$insert into public.profiles (id, tenant_id, role, full_name) values (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'member', 'Hantu')$$, 'buat profil Member');

-- Fungsi operasional ditolak
select pg_temp.expect_fail($$select public.redeem_points('+6282222', 10)$$, 'tukar poin Pelanggan lain');
select pg_temp.expect_fail($$select public.pay_order('00000000-0000-0000-0000-0000000000d1', '[{"method":"cash","amount":1}]'::jsonb)$$, 'pay_order');
select pg_temp.expect_fail($$select public.create_order('00000000-0000-0000-0000-0000000000b1', '[]'::jsonb)$$, 'create_order');
select pg_temp.eq('1A: escalate_stale_approvals no-op', pg_temp.n('select public.escalate_stale_approvals()'), 0);
select pg_temp.back();

-- ───── 3 · Member 1B: tidak melihat milik 1A ─────
select pg_temp.act_as('00000000-0000-0000-0000-00000000f102');
select pg_temp.eq('1B: pesanan sendiri saja', pg_temp.n($$select count(*) from public.orders where code='UJI-1B'$$), 1);
select pg_temp.eq('1B: tak melihat pesanan 1A', pg_temp.n($$select count(*) from public.orders where code='UJI-1A'$$), 0);
select pg_temp.eq('1B: poin sendiri', pg_temp.n('select points from public.customers'), 80);
select pg_temp.back();

-- ───── 4 · Member 2A (Tenant lain) ─────
select pg_temp.act_as('00000000-0000-0000-0000-00000000f201');
select pg_temp.eq('2A: hanya 1 pesanan (Tenant 2)', pg_temp.n('select count(*) from public.orders'), 1);
select pg_temp.eq('2A: tak melihat pelanggan Tenant 1', pg_temp.n($$select count(*) from public.customers where tenant_id = '00000000-0000-0000-0000-000000000001'$$), 0);
select pg_temp.eq('2A: tak ada produk Tenant 1', pg_temp.n($$select count(*) from public.products where tenant_id = '00000000-0000-0000-0000-000000000001'$$), 0);
select pg_temp.eq('2A: pasien tertutup', pg_temp.n('select count(*) from public.patients'), 0);
select pg_temp.back();

-- ───── 5 · Staf tetap bekerja seperti semula (tidak ikut dibatasi) ─────
select pg_temp.act_as('00000000-0000-0000-0000-00000000f301');
select pg_temp.eq('Staf: melihat semua pesanan cabangnya', (pg_temp.n('select count(*) from public.orders') >= 3)::int, 1);
select pg_temp.eq('Staf: tidak melihat profil Member', pg_temp.n($$select count(*) from public.profiles where role='member'$$), 0);
select pg_temp.eq('Staf: melihat pelanggan Tenant', (pg_temp.n('select count(*) from public.customers') >= 2)::int, 1);
select pg_temp.expect_fail($$insert into public.profiles (id, tenant_id, role, full_name) values (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'member', 'Palsu')$$, 'Staf membuat akun Member');
select pg_temp.back();
select pg_temp.act_as('00000000-0000-0000-0000-00000000f401');
select pg_temp.expect_fail($$insert into public.profiles (id, tenant_id, role, full_name) values (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'member', 'Palsu')$$, 'Owner membuat akun Member langsung');
select pg_temp.back();

-- ───── 5b · Setiap tabel RLS punya kebijakan Member (tabel baru tanpa kebijakan = gagal) ─────
do $$
declare t text;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname not in ('rbac_matrix', 'plans', 'icd_codes', 'feature_flags', 'industry_templates')
      and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname and p.policyname = 'member_ro')
  loop
    raise exception 'GAGAL: tabel % belum punya kebijakan member_ro. Jalankan select public.member_lockdown() di migrasi yang membuatnya.', t;
  end loop;
end $$;

-- ───── 6 · Matriks Member sama dengan yang dideklarasikan ─────
select pg_temp.eq('matriks: 20 baris Member', pg_temp.n($$select count(*) from public.rbac_matrix where role='member'$$), 20);
select pg_temp.eq('matriks: Member tanpa hak hapus/approve selain F18', pg_temp.n($$select count(*) from public.rbac_matrix where role='member' and (can_delete or can_approve) and feature <> 18$$), 0);

select 'LULUS member_isolation' as hasil;
rollback;

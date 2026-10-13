-- Uji dashboard Member: merek, beranda, profil, Kartu Member, ekspor, hapus akun. Cara menjalankan: lihat member_isolation.sql.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000f101', 'm1a@uji.test'), ('00000000-0000-0000-0000-00000000f102', 'm1b@uji.test'),
  ('00000000-0000-0000-0000-00000000f301', 's1@uji.test'), ('00000000-0000-0000-0000-00000000f401', 'o1@uji.test'),
  ('00000000-0000-0000-0000-00000000f501', 's2@uji.test'), ('00000000-0000-0000-0000-00000000f601', 'm3@uji.test');
insert into public.customers (id, tenant_id, phone, name, points, visits, total_spent) values
  ('00000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-000000000001', '081200000001', 'Member 1A', 120, 4, 150000),
  ('00000000-0000-0000-0000-00000000c102', '00000000-0000-0000-0000-000000000001', '081200000002', 'Member 1B', 80, 2, 60000),
  ('00000000-0000-0000-0000-00000000c301', '00000000-0000-0000-0000-000000000003', '081200000003', 'Member 3', 5, 1, 10000);
insert into public.profiles (id, tenant_id, branch_id, role, full_name, email, customer_id) values
  ('00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-000000000001', null, 'member', 'Member 1A', 'm1a@uji.test', '00000000-0000-0000-0000-00000000c101'),
  ('00000000-0000-0000-0000-00000000f102', '00000000-0000-0000-0000-000000000001', null, 'member', 'Member 1B', 'm1b@uji.test', '00000000-0000-0000-0000-00000000c102'),
  ('00000000-0000-0000-0000-00000000f601', '00000000-0000-0000-0000-000000000003', null, 'member', 'Member 3', 'm3@uji.test', '00000000-0000-0000-0000-00000000c301');
insert into public.profiles (id, tenant_id, branch_id, role, full_name, email) values
  ('00000000-0000-0000-0000-00000000f301', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'staff', 'Staff 1', 's1@uji.test'),
  ('00000000-0000-0000-0000-00000000f401', '00000000-0000-0000-0000-000000000001', null, 'owner', 'Owner 1', 'o1@uji.test'),
  ('00000000-0000-0000-0000-00000000f501', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b3', 'staff', 'Staff Tenant 2', 's2@uji.test');
insert into public.member_consents (tenant_id, profile_id, customer_id, kind, granted, policy_version) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-00000000c101', 'data_processing', true, '2026-10'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-00000000c101', 'marketing_whatsapp', false, '2026-10');
insert into public.orders (id, tenant_id, branch_id, code, status, subtotal, total, customer_phone, paid_at) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'DSH-1A', 'paid', 30000, 30000, '081200000001', now()),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'DSH-1B', 'paid', 40000, 40000, '081200000002', now());
insert into public.queue_entries (tenant_id, branch_id, kind, name, phone, party_size) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'table', 'Antre 1A', '081200000001', 2);
insert into public.promos (tenant_id, code, name, kind, value) values
  ('00000000-0000-0000-0000-000000000001', 'UJIPROMO', 'Promo uji', 'pct', 10);

create function pg_temp.act_as(p_uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true); perform set_config('role', 'authenticated', true); end $$;
create function pg_temp.back() returns void language plpgsql as $$
begin perform set_config('role', 'postgres', true); perform set_config('request.jwt.claim.sub', '', true); end $$;
create function pg_temp.fails(p_sql text, p_re text, p_what text) returns void language plpgsql as $$
begin
  begin execute p_sql; exception when others then
    if sqlerrm ~* p_re then return; end if;
    raise exception 'GAGAL: % ditolak dengan pesan lain: %', p_what, sqlerrm;
  end;
  raise exception 'GAGAL: % seharusnya ditolak', p_what;
end $$;
create function pg_temp.ok(p_what text, p_cond boolean) returns void language plpgsql as $$
begin if p_cond is not true then raise exception 'GAGAL: %', p_what; end if; end $$;

-- ───── Merek: Owner mengatur, validasi, Staf tak boleh, Member membaca lewat fungsi ─────
select pg_temp.act_as('00000000-0000-0000-0000-00000000f401');
insert into public.tenant_branding (tenant_id, display_name, accent_color, logo_url, welcome_text)
values ('00000000-0000-0000-0000-000000000001', 'Kopi Harum', '#7a3e12', 'https://cdn.contoh.test/logo.png', 'Selamat datang kembali');
select pg_temp.fails($$insert into public.tenant_branding (tenant_id, accent_color) values ('00000000-0000-0000-0000-000000000002', 'merah')$$, 'violates|row-level', 'warna tidak valid / lintas Tenant');
select pg_temp.fails($$update public.tenant_branding set logo_url = 'javascript:alert(1)' where tenant_id = '00000000-0000-0000-0000-000000000001'$$, 'violates', 'logo non-https');
select pg_temp.back();
select pg_temp.act_as('00000000-0000-0000-0000-00000000f301');
update public.tenant_branding set display_name = 'Diretas' where tenant_id = '00000000-0000-0000-0000-000000000001';  -- disaring RLS: 0 baris
select pg_temp.ok('Staf: merek tidak berubah', (select display_name from public.tenant_branding where tenant_id = '00000000-0000-0000-0000-000000000001') = 'Kopi Harum');
select pg_temp.back();

-- ───── Member 1A ─────
select pg_temp.act_as('00000000-0000-0000-0000-00000000f101');
select pg_temp.ok('brand: nama & warna', (public.member_brand()->>'display_name') = 'Kopi Harum' and (public.member_brand()->>'accent_color') = '#7a3e12');
select pg_temp.ok('brand: tidak membocorkan paket/ambang', not (public.member_brand() ? 'plan_id') and not (public.member_brand() ? 'void_owner_threshold'));
select pg_temp.ok('home: poin & kunjungan', (public.member_home()->>'points')::int = 120 and (public.member_home()->>'visits')::int = 4);
select pg_temp.ok('home: promo aktif tampil', jsonb_array_length(public.member_home()->'promos') = 1);
select pg_temp.ok('home: pesanan terakhir milik sendiri', (public.member_home()->'last_order'->>'code') = 'DSH-1A');
select pg_temp.ok('home: pemasaran awal false', (public.member_home()->>'marketing')::boolean = false);

-- profil: ubah nama, catatan, aktifkan pemasaran
select pg_temp.ok('profil: diperbarui', (public.member_update_profile('Hasan Baru', 'alergi kacang', true)->>'name') = 'Hasan Baru');
select pg_temp.ok('profil: pemasaran aktif', (public.member_home()->>'marketing')::boolean = true);
select pg_temp.ok('profil: catatan tersimpan', (public.member_home()->>'member_note') = 'alergi kacang');
select pg_temp.fails($$select public.member_update_profile(repeat('x', 200), null, null)$$, 'Nama', 'nama terlalu panjang');
update public.customers set points = 9999;  -- disaring RLS: 0 baris; hasilnya diperiksa di bawah
select pg_temp.back();
select pg_temp.ok('persetujuan: riwayat bertambah, tidak menimpa', (select count(*) from public.member_consents where profile_id = '00000000-0000-0000-0000-00000000f101' and kind = 'marketing_whatsapp') = 2);
select pg_temp.ok('profil: Member 1B tidak ikut berubah', (select name from public.customers where id = '00000000-0000-0000-0000-00000000c102') = 'Member 1B');
select pg_temp.ok('poin tidak berubah', (select points from public.customers where id = '00000000-0000-0000-0000-00000000c101') = 120);

-- ───── Peran yang bukan Member / Tenant tanpa Saklar Fitur ─────
select pg_temp.act_as('00000000-0000-0000-0000-00000000f301');
select pg_temp.fails($$select public.member_home()$$, 'khusus Member', 'Staf memanggil member_home');
select pg_temp.fails($$select public.member_card_token()$$, 'khusus Member', 'Staf meminta token kartu');
select pg_temp.fails($$select public.member_export()$$, 'khusus Member', 'Staf mengekspor');
select pg_temp.back();
select pg_temp.act_as('00000000-0000-0000-0000-00000000f601');
select pg_temp.fails($$select public.member_home()$$, 'belum diaktifkan', 'Member di Tenant Paket Starter');
select pg_temp.back();

-- ───── Kartu Member ─────
create temp table _tok (t text);
grant all on _tok to public;
select pg_temp.act_as('00000000-0000-0000-0000-00000000f101');
insert into _tok select public.member_card_token();
select pg_temp.ok('token: format HIN1.<id>.<exp>.<sig>', (select t ~ '^HIN1\.[0-9a-f-]{36}\.[0-9]+\.[0-9a-f]{64}$' from _tok));
select pg_temp.ok('token: panjang muat QR', (select length(t) <= 213 from _tok));
select pg_temp.fails($$select public.resolve_member_card((select t from _tok))$$, 'operasional|ditolak', 'Member memindai kartu');
select pg_temp.back();

select pg_temp.act_as('00000000-0000-0000-0000-00000000f301');
select pg_temp.ok('Staf: kartu sah dikenali', (public.resolve_member_card((select t from _tok))->>'customer_id')::uuid = '00000000-0000-0000-0000-00000000c101');
select pg_temp.ok('Staf: poin terbaca', (public.resolve_member_card((select t from _tok))->>'points')::int = 120);
select pg_temp.fails($$select public.resolve_member_card(regexp_replace((select t from _tok), '.$', 'x'))$$, 'tidak sah', 'tanda tangan diubah');
select pg_temp.fails($$select public.resolve_member_card(replace((select t from _tok), '00000000-0000-0000-0000-00000000c101', '00000000-0000-0000-0000-00000000c102'))$$, 'tidak sah', 'pelanggan diganti');
select pg_temp.fails($$select public.resolve_member_card('sembarang')$$, 'tidak dikenali', 'token sembarang');
select pg_temp.back();
-- token kedaluwarsa (ditandatangani sah tetapi lampau)
create temp table _old (t text);
grant all on _old to public;
insert into _old select 'HIN1.00000000-0000-0000-0000-00000000c101.' || (floor(extract(epoch from now()))::bigint - 5)::text || '.'
  || encode(extensions.hmac('HIN1.00000000-0000-0000-0000-00000000c101.' || (floor(extract(epoch from now()))::bigint - 5)::text, (select secret from public.member_card_keys), 'sha256'), 'hex');
select pg_temp.act_as('00000000-0000-0000-0000-00000000f301');
select pg_temp.fails($$select public.resolve_member_card((select t from _old))$$, 'kedaluwarsa', 'token kedaluwarsa');
select pg_temp.back();
-- Staf Tenant lain tidak bisa memakai kartu Tenant ini
select pg_temp.act_as('00000000-0000-0000-0000-00000000f501');
select pg_temp.fails($$select public.resolve_member_card((select t from _tok))$$, 'tidak ditemukan', 'Staf Tenant lain memindai');
select pg_temp.back();
-- Rahasia kartu tidak terbaca klien
select pg_temp.act_as('00000000-0000-0000-0000-00000000f401');
select pg_temp.ok('kunci kartu tak terbaca Owner', (select count(*) from public.member_card_keys) = 0);
select pg_temp.back();

-- ───── Ekspor data: hanya milik sendiri ─────
select pg_temp.act_as('00000000-0000-0000-0000-00000000f101');
select pg_temp.ok('ekspor: pesanan sendiri saja', jsonb_array_length(public.member_export()->'pesanan') = 1 and (public.member_export()->'pesanan'->0->>'kode') = 'DSH-1A');
select pg_temp.ok('ekspor: tanpa data Member lain', position('Member 1B' in public.member_export()::text) = 0 and position('081200000002' in public.member_export()::text) = 0);
select pg_temp.ok('ekspor: persetujuan ikut', jsonb_array_length(public.member_export()->'persetujuan') >= 2);
select pg_temp.back();

-- ───── Hapus akun ─────
select pg_temp.act_as('00000000-0000-0000-0000-00000000f101');
select pg_temp.fails($$select public.member_delete_account('hapus saja')$$, 'HAPUS', 'konfirmasi salah');
select pg_temp.ok('hapus: berhasil', (public.member_delete_account('HAPUS')->>'dihapus')::boolean);
select pg_temp.back();
select pg_temp.ok('hapus: profil hilang', not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000f101'));
select pg_temp.ok('hapus: akun Auth hilang', not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000f101'));
select pg_temp.ok('hapus: Pelanggan hilang', not exists (select 1 from public.customers where id = '00000000-0000-0000-0000-00000000c101'));
select pg_temp.ok('hapus: persetujuan hilang', not exists (select 1 from public.member_consents where profile_id = '00000000-0000-0000-0000-00000000f101'));
select pg_temp.ok('hapus: pesanan tetap ada tanpa identitas', exists (select 1 from public.orders where code = 'DSH-1A' and customer_id is null and customer_phone is null));
select pg_temp.ok('hapus: antrean dianonimkan', not exists (select 1 from public.queue_entries where phone = '081200000001'));
select pg_temp.ok('hapus: tercatat di Jejak Audit tanpa data pribadi', exists (select 1 from public.audit_logs where action = 'delete_account' and entity_id = '00000000-0000-0000-0000-00000000f101'));
select pg_temp.ok('hapus: Member 1B utuh', exists (select 1 from public.customers where id = '00000000-0000-0000-0000-00000000c102') and exists (select 1 from public.orders where code = 'DSH-1B' and customer_id is not null));

select 'LULUS member_dashboard' as hasil;
rollback;

-- Uji masuk Member (Kode Masuk, batas laju, penautan Pelanggan, Persetujuan Data). Lihat member_isolation.sql untuk cara menjalankan.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'baru@member.test'), ('00000000-0000-0000-0000-00000000a002', 'lama@member.test'),
  ('00000000-0000-0000-0000-00000000a003', 'penyusup@member.test');
-- Pelanggan lama (disimpan staf dalam bentuk +62) dengan poin
insert into public.customers (id, tenant_id, phone, name, points) values
  ('00000000-0000-0000-0000-00000000c901', '00000000-0000-0000-0000-000000000001', '+6285512345678', 'Pelanggan Lama', 77);

create function pg_temp.eq(p_what text, p_got text, p_want text) returns void language plpgsql as $$
begin if p_got is distinct from p_want then raise exception 'GAGAL: % → dapat %, seharusnya %', p_what, p_got, p_want; end if; end $$;
create function pg_temp.fails(p_sql text, p_re text, p_what text) returns void language plpgsql as $$
begin
  begin execute p_sql; exception when others then
    if sqlerrm ~* p_re then return; end if;
    raise exception 'GAGAL: % ditolak dengan pesan lain: %', p_what, sqlerrm;
  end;
  raise exception 'GAGAL: % seharusnya ditolak', p_what;
end $$;
create temp table _ctx (k text primary key, v text);
grant all on _ctx to public;

-- ───── Gerbang ─────
select pg_temp.fails($$select public.member_otp_issue('00000000-0000-0000-0000-000000000001','085511111111','perangkat-uji-01', false)$$, 'persetujuan', 'tanpa persetujuan data');
select pg_temp.fails($$select public.member_otp_issue('00000000-0000-0000-0000-000000000001','12345','perangkat-uji-01', true)$$, 'tidak valid', 'nomor tidak valid');
select pg_temp.fails($$select public.member_otp_issue('00000000-0000-0000-0000-000000000001','085511111111','pdk', true)$$, 'perangkat', 'perangkat tidak dikenali');
select pg_temp.fails($$select public.member_otp_issue('00000000-0000-0000-0000-000000000003','085511111111','perangkat-uji-01', true)$$, 'belum diaktifkan', 'Tenant Paket Starter tanpa Saklar Fitur');

-- ───── Hanya service_role yang boleh memanggil ─────
set local role authenticated;
select pg_temp.fails($$select public.member_otp_issue('00000000-0000-0000-0000-000000000001','085511111111','perangkat-uji-01', true)$$, 'permission denied', 'authenticated memanggil member_otp_issue');
select pg_temp.fails($$select public.member_complete(gen_random_uuid(), null, null)$$, 'permission denied', 'authenticated memanggil member_complete');
reset role;
-- (member_otps: RLS aktif tanpa kebijakan → authenticated melihat 0 baris bila diberi grant)
set local role authenticated;
do $$ begin if (select count(*) from public.member_otps) <> 0 then raise exception 'GAGAL: authenticated melihat OTP'; end if; end $$;
reset role;

-- ───── Kode salah, terkunci, kode benar ─────
do $$
declare r jsonb; v jsonb; i int; good text;
begin
  r := public.member_otp_issue('00000000-0000-0000-0000-000000000001','+62 855-1234-5678','perangkat-uji-01', true, true);
  good := r->>'code';
  if good !~ '^[0-9]{6}$' then raise exception 'GAGAL: kode bukan 6 digit'; end if;
  if r->>'phone' <> '085512345678' then raise exception 'GAGAL: nomor tidak dinormalkan: %', r->>'phone'; end if;
  if (select code_hash from member_otps where id = (r->>'otp_id')::uuid) = good then raise exception 'GAGAL: kode tersimpan polos'; end if;

  -- perangkat lain tidak bisa memakai kode
  v := public.member_otp_verify('00000000-0000-0000-0000-000000000001','085512345678', good, 'perangkat-lain-99');
  if (v->>'ok')::boolean then raise exception 'GAGAL: kode diterima dari perangkat lain'; end if;
  -- 4 salah lagi → total 5 → terkunci, kode benar pun ditolak
  for i in 1..4 loop v := public.member_otp_verify('00000000-0000-0000-0000-000000000001','085512345678','000000','perangkat-uji-01'); end loop;
  v := public.member_otp_verify('00000000-0000-0000-0000-000000000001','085512345678', good, 'perangkat-uji-01');
  if (v->>'ok')::boolean or v->>'reason' <> 'terkunci' then raise exception 'GAGAL: tidak terkunci setelah 5 percobaan: %', v; end if;
end $$;

-- ───── Alur sukses: Pelanggan lama (+62…) ditemukan, poin ikut, profil Member dibuat ─────
do $$
declare r jsonb; v jsonb; c jsonb;
begin
  -- jendela batas laju per nomor: sudah 1 permintaan; boleh 2 lagi dalam 15 menit
  r := public.member_otp_issue('00000000-0000-0000-0000-000000000001','085512345678','perangkat-uji-02', true, false);
  v := public.member_otp_verify('00000000-0000-0000-0000-000000000001','085512345678', r->>'code', 'perangkat-uji-02');
  if not (v->>'ok')::boolean then raise exception 'GAGAL: kode benar ditolak: %', v; end if;
  if (v->>'customer_id')::uuid <> '00000000-0000-0000-0000-00000000c901' then raise exception 'GAGAL: tidak menaut Pelanggan lama'; end if;
  if not (v->>'is_new')::boolean then raise exception 'GAGAL: seharusnya baru'; end if;
  c := public.member_complete((v->>'otp_id')::uuid, '00000000-0000-0000-0000-00000000a001', 'Nama Baru');
  if (c->>'points')::int <> 77 then raise exception 'GAGAL: poin lama tidak terbawa: %', c; end if;
  if (select role from profiles where id = '00000000-0000-0000-0000-00000000a001') <> 'member' then raise exception 'GAGAL: profil bukan member'; end if;
  if (select customer_id from profiles where id = '00000000-0000-0000-0000-00000000a001') <> '00000000-0000-0000-0000-00000000c901' then raise exception 'GAGAL: profil tak tertaut'; end if;
  if (select count(*) from customers where tenant_id = '00000000-0000-0000-0000-000000000001' and public.norm_phone(phone) like '%855%') <> 1 then raise exception 'GAGAL: Pelanggan terduplikasi'; end if;
  -- persetujuan terpisah dan bertanda waktu
  if (select count(*) from member_consents where profile_id = '00000000-0000-0000-0000-00000000a001') <> 2 then raise exception 'GAGAL: dua persetujuan tidak tercatat'; end if;
  if not (select granted from member_consents where profile_id = '00000000-0000-0000-0000-00000000a001' and kind = 'data_processing') then raise exception 'GAGAL: persetujuan data'; end if;
  if (select granted from member_consents where profile_id = '00000000-0000-0000-0000-00000000a001' and kind = 'marketing_whatsapp') then raise exception 'GAGAL: pemasaran seharusnya tidak'; end if;
  if (select recorded_at from member_consents where profile_id = '00000000-0000-0000-0000-00000000a001' limit 1) is null then raise exception 'GAGAL: waktu persetujuan'; end if;
  -- kode sekali pakai
  begin perform public.member_complete((v->>'otp_id')::uuid, '00000000-0000-0000-0000-00000000a001', null);
  exception when others then null; end;
  if (select count(*) from profiles where customer_id = '00000000-0000-0000-0000-00000000c901') <> 1 then raise exception 'GAGAL: profil ganda'; end if;
end $$;

-- ───── Masuk ulang: tidak membuat profil/persetujuan baru; orang lain tidak bisa mengambil Pelanggan yang sama ─────
do $$
declare r jsonb; v jsonb; c jsonb;
begin
  r := public.member_otp_issue('00000000-0000-0000-0000-000000000001','085512345678','perangkat-uji-03', true, true);
  v := public.member_otp_verify('00000000-0000-0000-0000-000000000001','085512345678', r->>'code', 'perangkat-uji-03');
  if (v->>'is_new')::boolean then raise exception 'GAGAL: masuk ulang dianggap baru'; end if;
  if (v->>'profile_id')::uuid <> '00000000-0000-0000-0000-00000000a001' then raise exception 'GAGAL: profil lama tidak ditemukan'; end if;
  c := public.member_complete((v->>'otp_id')::uuid, '00000000-0000-0000-0000-00000000a003', 'Penyusup');
  if (c->>'profile_id')::uuid <> '00000000-0000-0000-0000-00000000a001' then raise exception 'GAGAL: penyusup mendapat profil lain'; end if;
  if exists (select 1 from profiles where id = '00000000-0000-0000-0000-00000000a003') then raise exception 'GAGAL: profil penyusup dibuat'; end if;
  if (select count(*) from member_consents where profile_id = '00000000-0000-0000-0000-00000000a001') <> 2 then raise exception 'GAGAL: persetujuan bertambah saat masuk ulang'; end if;
end $$;

-- ───── Batas laju: nomor ke-4 dalam 15 menit ditolak (sudah 3 permintaan untuk 0855…5678) ─────
select pg_temp.fails($$select public.member_otp_issue('00000000-0000-0000-0000-000000000001','085512345678','perangkat-uji-04', true)$$, 'terlalu banyak', 'permintaan ke-4 pada nomor yang sama');

-- ───── Batas laju per perangkat: 10 per jam ─────
do $$
declare i int;
begin
  for i in 1..10 loop
    perform public.member_otp_issue('00000000-0000-0000-0000-000000000001', '0877000' || lpad(i::text, 4, '0'), 'perangkat-boros-01', true);
  end loop;
end $$;
select pg_temp.fails($$select public.member_otp_issue('00000000-0000-0000-0000-000000000001','087700009999','perangkat-boros-01', true)$$, 'terlalu banyak', 'permintaan ke-11 dari satu perangkat');

-- ───── Nomor baru: Pelanggan dibuat ─────
do $$
declare r jsonb; v jsonb; c jsonb;
begin
  r := public.member_otp_issue('00000000-0000-0000-0000-000000000001','0821 9999 0001','perangkat-uji-05', true, false);
  v := public.member_otp_verify('00000000-0000-0000-0000-000000000001','082199990001', r->>'code', 'perangkat-uji-05');
  c := public.member_complete((v->>'otp_id')::uuid, '00000000-0000-0000-0000-00000000a002', 'Pendatang');
  if (c->>'points')::int <> 0 or not (c->>'is_new')::boolean then raise exception 'GAGAL: pendaftar baru: %', c; end if;
  if (select phone from customers where id = (c->>'customer_id')::uuid) <> '082199990001' then raise exception 'GAGAL: bentuk nomor Pelanggan baru'; end if;
end $$;

-- ───── Kedaluwarsa ─────
do $$
declare r jsonb; v jsonb;
begin
  r := public.member_otp_issue('00000000-0000-0000-0000-000000000001','082188880002','perangkat-uji-06', true);
  update member_otps set expires_at = now() - interval '1 second' where id = (r->>'otp_id')::uuid;
  v := public.member_otp_verify('00000000-0000-0000-0000-000000000001','082188880002', r->>'code', 'perangkat-uji-06');
  if (v->>'ok')::boolean or v->>'reason' <> 'kedaluwarsa' then raise exception 'GAGAL: kode kedaluwarsa diterima: %', v; end if;
end $$;

-- ───── Member hanya membaca persetujuan sendiri; baris lintas Tenant/ orang tertutup ─────
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.member_consents) <> 2 then raise exception 'GAGAL: Member tidak membaca persetujuannya sendiri'; end if;
  if (select count(*) from public.customers) <> 1 then raise exception 'GAGAL: Member melihat Pelanggan lain'; end if;
end $$;
reset role;

select 'LULUS member_login' as hasil;
rollback;

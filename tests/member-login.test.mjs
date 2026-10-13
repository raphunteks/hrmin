// Alur masuk Member pada adapter demo (cermin supabase/tests/member_login.sql).
import test from "node:test";
import assert from "node:assert/strict";
import { createMemberAuth, phoneLocal, phoneVariants } from "../src/api/demoMember.js";

const T = "t1";
const mkdb = () => ({
  tenants: [{ id: "t1", slug: "kopi-harum", plan_id: "a2", status: "active" }, { id: "t3", slug: "tb", plan_id: "a1", status: "active" }],
  plans: [{ id: "a1", code: "starter" }, { id: "a2", code: "growth" }],
  customers: [{ id: "cu9", tenant_id: "t1", phone: "+6285512345678", name: "Lama", points: 77 }],
  profiles: [], member_otps: [],
});
let clock = 1_000_000;
const mk = (db = mkdb(), seq = ["111111", "222222", "333333", "444444", "555555", "666666", "777777"]) =>
  createMemberAuth(db, { now: () => clock, code: () => seq.shift() ?? "999999", id: (() => { let n = 0; return () => `id-${++n}-${Math.random().toString(16).slice(2, 8)}`; })() });
const D = "perangkat-uji-01";

test("nomor dinormalkan ke 08… dan varian +62/62 dikenali", () => {
  assert.equal(phoneLocal("+62 855-1234-5678"), "085512345678");
  assert.equal(phoneLocal("85512345678"), "085512345678");
  assert.deepEqual(phoneVariants("085512345678"), ["085512345678", "+6285512345678", "6285512345678"]);
  assert.throws(() => phoneLocal("12345"), /tidak valid/);
});

test("gerbang: persetujuan data wajib, perangkat dikenali, Paket Starter ditolak", () => {
  const m = mk();
  assert.throws(() => m.request({ tenantId: T, phone: "085511111111", device: D, consentData: false }), /Persetujuan/);
  assert.throws(() => m.request({ tenantId: T, phone: "085511111111", device: "pdk", consentData: true }), /Perangkat/);
  assert.throws(() => m.request({ tenantId: "t3", phone: "085511111111", device: D, consentData: true }), /belum diaktifkan/);
});

test("kode salah 5 kali mengunci; kode benar sesudahnya tetap ditolak; perangkat lain ditolak", () => {
  const m = mk();
  const r = m.request({ tenantId: T, phone: "085512345678", device: D, consentData: true });
  assert.equal(m.verify({ tenantId: T, phone: "085512345678", code: r.code, device: "perangkat-lain-9" }).ok, false);
  for (let i = 0; i < 4; i++) m.verify({ tenantId: T, phone: "085512345678", code: "000000", device: D });
  const v = m.verify({ tenantId: T, phone: "085512345678", code: r.code, device: D });
  assert.deepEqual([v.ok, v.reason], [false, "terkunci"]);
});

test("sukses: Pelanggan lama (+62) ditaut, poin ikut, dua persetujuan tercatat, kode sekali pakai", () => {
  const db = mkdb();
  const m = mk(db);
  const r = m.request({ tenantId: T, phone: "+62 855-1234-5678", device: D, consentData: true, consentMarketing: false });
  const v = m.verify({ tenantId: T, phone: "085512345678", code: r.code, device: D });
  assert.equal(v.ok, true);
  assert.equal(v.customer_id, "cu9");
  const done = m.complete({ otpId: v.otp_id, name: "Nama Baru" });
  assert.equal(done.customer.points, 77);
  assert.equal(done.profile.role, "member");
  assert.equal(done.profile.customer_id, "cu9");
  assert.equal(db.customers.length, 1, "tidak ada Pelanggan ganda");
  const cons = db.member_consents.filter((c) => c.profile_id === done.profile.id);
  assert.deepEqual(cons.map((c) => [c.kind, c.granted]).sort(), [["data_processing", true], ["marketing_whatsapp", false]]);
  assert.ok(cons.every((c) => c.recorded_at));
  assert.throws(() => m.complete({ otpId: v.otp_id }), /kedaluwarsa/);
});

test("masuk ulang memakai profil lama dan tidak menambah persetujuan", () => {
  const db = mkdb();
  const m = mk(db);
  const r1 = m.request({ tenantId: T, phone: "085512345678", device: D, consentData: true });
  m.complete({ otpId: m.verify({ tenantId: T, phone: "085512345678", code: r1.code, device: D }).otp_id });
  clock += 20 * 60_000;
  const r2 = m.request({ tenantId: T, phone: "085512345678", device: D, consentData: true, consentMarketing: true });
  const v2 = m.verify({ tenantId: T, phone: "085512345678", code: r2.code, device: D });
  assert.equal(v2.is_new, false);
  const again = m.complete({ otpId: v2.otp_id });
  assert.equal(again.is_new, false);
  assert.equal(db.profiles.length, 1);
  assert.equal(db.member_consents.length, 2);
});

test("batas laju: 3 per nomor/15 menit, 10 per perangkat/jam", () => {
  const m = mk();
  clock += 3_600_000;
  for (let i = 0; i < 3; i++) m.request({ tenantId: T, phone: "085500000001", device: D, consentData: true });
  assert.throws(() => m.request({ tenantId: T, phone: "085500000001", device: D, consentData: true }), /Terlalu banyak/);
  const m2 = mk();
  clock += 3_600_000;
  for (let i = 0; i < 10; i++) m2.request({ tenantId: T, phone: `08770000${String(i).padStart(4, "0")}`, device: "perangkat-boros", consentData: true });
  assert.throws(() => m2.request({ tenantId: T, phone: "087700009999", device: "perangkat-boros", consentData: true }), /Terlalu banyak/);
});

test("kode kedaluwarsa setelah 5 menit", () => {
  const m = mk();
  clock += 3_600_000;
  const r = m.request({ tenantId: T, phone: "082188880002", device: D, consentData: true });
  clock += 5 * 60_000 + 1;
  assert.equal(m.verify({ tenantId: T, phone: "082188880002", code: r.code, device: D }).reason, "kedaluwarsa");
});

// Tes kontrak alur Pesanan lewat antarmuka RPC (adapter demo). Skenario yang sama harus dipenuhi adapter Supabase.
// Jalankan: npm test
import test, { before } from "node:test";
import assert from "node:assert/strict";

const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
globalThis.localStorage = store();
globalThis.sessionStorage = store();
const { api } = await import("../src/api/demo.js");

const GM_PIN = "246810";
const B1 = "b1";
let kontrakShift;

const as = (email) => api.signIn(email);
const rejects = (p, re) => assert.rejects(p, (e) => re.test(e.message), `harus ditolak: ${re}`);
const bayarTunai = (total) => [{ method: "cash", amount: total }];

before(async () => {
  // Matikan kunci jam operasional agar tes tidak bergantung jam eksekusi.
  await as("owner@demo.harum.in");
  for (const pol of await api.listTenantPolicies()) {
    await api.saveTenantPolicy({
      tenantId: pol.tenant_id,
      branchId: pol.branch_id,
      role: pol.role,
      discount: pol.max_discount_pct,
      voidLimit: pol.max_void_without_pin,
      start: pol.operating_hours_start,
      end: pol.operating_hours_end,
      radius: pol.geofence_radius_meters,
      lock: false,
    });
  }
  await as("staff@demo.harum.in");
  kontrakShift = await api.rpc("open_shift", { p_branch: B1, p_opening: 100000 });
});

const buatPesanan = async (qty = 1) => api.rpc("create_order", { p_branch: B1, p_items: [{ product_id: "e001", qty }] });

test("Pesanan tunai: dibuat, dibayar, status lunas, total konsisten", async () => {
  const o = await buatPesanan(2);
  assert.equal(o.status, "open");
  assert.equal(o.subtotal, 64000);
  const paid = await api.rpc("pay_order", { p_order: o.id, p_payments: bayarTunai(o.subtotal + 100000) });
  assert.equal(paid.status, "paid");
  assert.equal(paid.total, paid.subtotal - paid.discount + paid.tax);
});

test("Pesanan lunas tidak bisa dibayar dua kali", async () => {
  const o = await buatPesanan();
  await api.rpc("pay_order", { p_order: o.id, p_payments: bayarTunai(100000) });
  await rejects(api.rpc("pay_order", { p_order: o.id, p_payments: bayarTunai(100000) }), /sudah dibayar|dibatalkan/i);
});

test("Pembayaran kurang ditolak", async () => {
  const o = await buatPesanan();
  await rejects(api.rpc("pay_order", { p_order: o.id, p_payments: bayarTunai(1000) }), /kurang/i);
});

test("Diskon di atas batas Staff wajib PIN GM; PIN salah ditolak; PIN benar lolos", async () => {
  const o = await buatPesanan(2); // subtotal 64.000, diskon 50% jauh di atas batas
  const base = { p_order: o.id, p_payments: bayarTunai(100000), p_discount: 32000 };
  await rejects(api.rpc("pay_order", base), /PIN/i);
  await rejects(api.rpc("pay_order", { ...base, p_pin: "000000" }), /PIN/i);
  const paid = await api.rpc("pay_order", { ...base, p_pin: GM_PIN });
  assert.equal(paid.status, "paid");
  assert.equal(paid.discount, 32000);
});

test("Void: Staff mengajukan, GM menyetujui dengan PIN + catatan, Staff tidak boleh memutuskan sendiri", async () => {
  const o = await buatPesanan();
  await api.rpc("pay_order", { p_order: o.id, p_payments: bayarTunai(100000) });
  const ap = await api.rpc("request_void", { p_order: o.id, p_reason: "Salah Input Kasir", p_note: "uji kontrak" });
  assert.equal(ap.status, "pending");
  assert.equal(ap.detail.escalated_to_owner, false);
  await rejects(api.rpc("decide_approval", { p_id: ap.id, p_decision: "approved", p_note: "x", p_pin: GM_PIN, p_option: "waste" }), /Akses ditolak|tidak memiliki hak|sendiri/i);

  await as("gm@demo.harum.in");
  await rejects(api.rpc("decide_approval", { p_id: ap.id, p_decision: "approved", p_note: "ok", p_pin: "000000", p_option: "waste" }), /PIN/i);
  await rejects(api.rpc("decide_approval", { p_id: ap.id, p_decision: "approved", p_note: "", p_pin: GM_PIN, p_option: "waste" }), /Catatan/i);
  const done = await api.rpc("decide_approval", { p_id: ap.id, p_decision: "approved", p_note: "ok", p_pin: GM_PIN, p_option: "waste" });
  assert.equal(done.status, "approved");
  const [after] = (await api.list("orders")).filter((x) => x.id === o.id);
  assert.equal(after.status, "void");
  await as("staff@demo.harum.in");
});

test("Void di atas ambang naik ke Owner; GM tidak boleh memutuskan", async () => {
  // Ambang bawaan Tenant 500.000: 16 × 32.000 = 512.000 melewatinya.
  const o = await buatPesanan(16);
  await api.rpc("pay_order", { p_order: o.id, p_payments: bayarTunai(600000) });
  const ap = await api.rpc("request_void", { p_order: o.id, p_reason: "Pelanggan Membatalkan", p_note: "uji eskalasi" });
  assert.equal(ap.detail.escalated_to_owner, true);

  await as("gm@demo.harum.in");
  await rejects(api.rpc("decide_approval", { p_id: ap.id, p_decision: "approved", p_note: "ok", p_pin: GM_PIN, p_option: "waste" }), /Owner/i);

  await as("owner@demo.harum.in");
  const done = await api.rpc("decide_approval", { p_id: ap.id, p_decision: "approved", p_note: "ok", p_pin: GM_PIN, p_option: "waste" });
  assert.equal(done.status, "approved");
  await as("staff@demo.harum.in");
});

test("dashboard_daily: Owner menerima baris harian per cabang dengan pendapatan angka", async () => {
  await as("owner@demo.harum.in");
  const today = new Date().toISOString().slice(0, 10);
  const rows = await api.dashboardDaily({ from: "2020-01-01", to: today });
  assert.ok(Array.isArray(rows) && rows.length > 0);
  for (const r of rows.slice(0, 20)) {
    assert.equal(typeof r.revenue, "number");
    assert.ok("branch_id" in r && "day" in r && "orders" in r);
  }
  await as("staff@demo.harum.in");
});

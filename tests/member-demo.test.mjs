// Isolasi Member pada adapter demo (cermin dari supabase/tests/member_isolation.sql).
import test, { before } from "node:test";
import assert from "node:assert/strict";

const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
globalThis.localStorage = store();
globalThis.sessionStorage = store();
const { api } = await import("../src/api/demo.js");

const as = (email) => api.signIn(email);
const rejects = (p, re = /Akses ditolak|tidak/i) => assert.rejects(p, (e) => re.test(e.message));
const phone1 = "081100000301"; // cu1 (Member 1)
const phone2 = "081100000302"; // cu2 (Member 2)

before(async () => {
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
  await api.rpc("open_shift", { p_branch: "b1", p_opening: 100000 });
  for (const [phone, qty] of [[phone1, 1], [phone2, 2]]) {
    const o = await api.rpc("create_order", { p_branch: "b1", p_items: [{ product_id: "e001", qty }] });
    await api.rpc("pay_order", { p_order: o.id, p_payments: [{ method: "cash", amount: 200000 }], p_customer_phone: phone });
  }
  const anon = await api.rpc("create_order", { p_branch: "b1", p_items: [{ product_id: "e001", qty: 1 }] });
  await api.rpc("pay_order", { p_order: anon.id, p_payments: [{ method: "cash", amount: 200000 }] });
});

test("Member 1 hanya melihat Pelanggan, Pesanan, dan pembayaran miliknya", async () => {
  await as("member@demo.harum.in");
  const cust = await api.list("customers");
  assert.deepEqual(cust.map((c) => c.id), ["cu1"]);
  const orders = await api.list("orders");
  assert.ok(orders.length >= 1);
  assert.ok(orders.every((o) => o.customer_phone === phone1), "semua pesanan bernomor Member 1");
  for (const o of orders) {
    const items = await api.list("order_items", { eq: { order_id: o.id } });
    assert.ok(items.length > 0);
  }
  assert.equal((await api.list("profiles")).length, 1);
});

test("Member 2 tidak melihat milik Member 1", async () => {
  await as("member2@demo.harum.in");
  const orders = await api.list("orders");
  assert.ok(orders.length >= 1 && orders.every((o) => o.customer_phone === phone2));
  assert.deepEqual((await api.list("customers")).map((c) => c.id), ["cu2"]);
});

test("Member tidak membaca tabel operasional, klinis, atau keuangan", async () => {
  await as("member@demo.harum.in");
  for (const t of ["inventory_items", "stock_levels", "bom_lines", "journal_entries", "accounts", "payroll_runs", "attendance", "vendors", "purchase_orders", "approvals", "patients", "visits", "prescriptions", "shifts", "petty_cash", "work_shifts"]) {
    const rows = await api.list(t).catch(() => []);
    assert.equal(rows.length, 0, `${t} harus kosong untuk Member`);
  }
});

test("Katalog produk terbaca, tanpa akses tulis", async () => {
  await as("member@demo.harum.in");
  assert.ok((await api.list("products")).length > 0);
  await rejects(api.update("customers", "cu1", { points: 99999 }));
  await rejects(api.insert("customers", { tenant_id: "t1", phone: "0899" }));
  await rejects(api.remove("orders", "x"));
});

test("Fungsi operasional ditolak untuk Member", async () => {
  await as("member@demo.harum.in");
  await rejects(api.rpc("pay_order", { p_order: "x", p_payments: [] }));
  await rejects(api.rpc("create_order", { p_branch: "b1", p_items: [] }));
  await rejects(api.rpc("redeem_points", { p_phone: phone2, p_points: 1 }));
  await rejects(api.dashboardDaily({ from: "2020-01-01", to: "2099-12-31" }));
});

test("RPC dashboard Member: beranda, profil, kartu, ekspor (demo)", async () => {
  await as("member@demo.harum.in");
  const home = await api.rpc("member_home");
  assert.ok(home.points >= 46, "poin lama ikut, ditambah pembelian di tes");
  const upd = await api.rpc("member_update_profile", { p_name: "Hasan Baru", p_note: "alergi kacang", p_marketing: true });
  assert.equal(upd.name, "Hasan Baru");
  assert.equal(upd.marketing, true);
  assert.equal((await api.rpc("member_home")).member_note, "alergi kacang");
  const exp = await api.rpc("member_export");
  assert.ok(exp.pesanan.every((o) => typeof o.kode === "string"));
  assert.ok(!JSON.stringify(exp).includes("081100000302"), "tanpa data Member lain");
  const tok = await api.rpc("member_card_token");
  assert.match(tok, /^HIN1\.cu1\.\d+\.[A-Za-z0-9]+$/);
  await rejects(api.rpc("resolve_member_card", { p_token: tok }));
  await as("staff@demo.harum.in");
  const who = await api.rpc("resolve_member_card", { p_token: tok });
  assert.equal(who.customer_id, "cu1");
  await rejects(api.rpc("resolve_member_card", { p_token: tok.slice(0, -1) + "x" }), /tidak sah/);
  await as("member@demo.harum.in");
  await rejects(api.rpc("member_delete_account", { p_confirm: "hapus saja" }), /HAPUS/);
});

test("Hapus akun (demo): profil dan Pelanggan hilang, pesanan tetap tanpa identitas", async () => {
  await as("member2@demo.harum.in");
  const before = (await api.list("orders")).length;
  assert.ok(before >= 1);
  const r = await api.rpc("member_delete_account", { p_confirm: "HAPUS" });
  assert.equal(r.dihapus, true);
  assert.ok(r.pesanan_dianonimkan >= 1);
  await as("owner@demo.harum.in");
  assert.equal((await api.list("customers")).some((c) => c.id === "cu2"), false);
  assert.ok((await api.list("orders")).some((o) => !o.customer_phone));
});

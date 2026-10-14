// Adapter produksi: semua akses lewat Supabase. RLS di database adalah penjaga utama;
// pengecekan can() di UI hanya untuk menyembunyikan aksi yang pasti ditolak.
import { supabase } from "../lib/supabase.js";

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

async function fnError(error) {
  let msg = error.message;
  let extra = {};
  try { const j = await error.context?.json?.(); if (j?.error) msg = j.error; extra = { reason: j?.reason, attempts_left: j?.attempts_left }; } catch { /* pakai pesan bawaan */ }
  return Object.assign(new Error(msg), extra);
}

export const api = {
  mode: "supabase",

  // ── Auth ──
  async getSessionUserId() {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  },
  onAuthChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s?.user?.id ?? null));
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) {
    ok(await supabase.auth.signInWithPassword({ email, password }));
  },
  async signOut() {
    await supabase.auth.signOut();
  },
  async getProfile(uid) {
    return ok(await supabase.from("profiles").select("id, tenant_id, branch_id, role, full_name, email").eq("id", uid).single());
  },

  // ── Platform (fitur 1) ──
  platformOverview: async () => ok(await supabase.rpc("platform_overview"))[0],
  listTenants: async () =>
    ok(await supabase.from("tenants").select("*, plan:plans(id, name, price_month)").order("created_at")),
  saveTenant: async (t) => {
    const { plan, ...row } = t;
    return ok(t.id ? await supabase.from("tenants").update(row).eq("id", t.id).select().single()
                   : await supabase.from("tenants").insert(row).select().single());
  },
  deleteTenant: async (id) => ok(await supabase.from("tenants").delete().eq("id", id)),
  listPlans: async () => ok(await supabase.from("plans").select("*").order("price_month", { nullsFirst: false })),
  savePlan: async (p) =>
    ok(p.id ? await supabase.from("plans").update(p).eq("id", p.id).select().single()
            : await supabase.from("plans").insert(p).select().single()),
  deletePlan: async (id) => ok(await supabase.from("plans").delete().eq("id", id)),
  listInvoices: async () => ok(await supabase.from("invoices").select("*").order("period", { ascending: false })),
  getSettings: async () => Object.fromEntries(ok(await supabase.from("platform_settings").select("key, value")).map((r) => [r.key, r.value])),
  saveSetting: async (key, value) => ok(await supabase.from("platform_settings").upsert({ key, value, updated_at: new Date().toISOString() })),
  getIntegration: async (tenantId) =>
    ok(await supabase.from("tenant_integrations").select("*").eq("tenant_id", tenantId).maybeSingle()),
  saveIntegration: async (row) => ok(await supabase.from("tenant_integrations").upsert({ ...row, updated_at: new Date().toISOString() })),
  listAudit: async ({ tenantId, limit = 200 } = {}) => {
    let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
    if (tenantId) q = q.eq("tenant_id", tenantId);
    return ok(await q);
  },
  logAccess: async (tenantId, area) => ok(await supabase.rpc("log_superadmin_access", { p_tenant: tenantId, p_area: area })),
  getBlueprint: async () => ok(await supabase.from("blueprint_docs").select("content").eq("id", "harumin-v1").single()).content,

  // ── Bisnis ──
  listBranches: async (tenantId) => ok(await supabase.from("branches").select("id, name, city, is_warehouse").eq("tenant_id", tenantId).order("name")),
  dashboardDaily: async ({ from, to, tenantId, branchId }) =>
    ok(await supabase.rpc("dashboard_daily", { p_from: from, p_to: to, p_tenant: tenantId ?? null, p_branch: branchId ?? null })),
  profitLoss: async ({ from, to, tenantId }) =>
    ok(await supabase.rpc("profit_loss", { p_from: from, p_to: to, p_tenant: tenantId ?? null })),
  listApprovals: async ({ tenantId, kind } = {}) => {
    let q = supabase.from("approvals").select("*, branch:branches(name), requester:profiles!requested_by(full_name, email, role)").order("requested_at", { ascending: false });
    if (tenantId) q = q.eq("tenant_id", tenantId);
    if (kind && kind !== "all") q = q.eq("kind", kind);
    return ok(await q);
  },
  approvalSummary: async (tenantId) => ok(await supabase.rpc("approval_summary", { p_tenant: tenantId ?? null }))[0],
  decideApproval: async (id, decision, note, pin, option) =>
    ok(await supabase.rpc("decide_approval", { p_id: id, p_decision: decision, p_note: note || null, p_pin: pin || null, p_option: option || null })),
  listCapital: async (tenantId) =>
    ok(await supabase.from("capital_applications").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false })),
  saveCapital: async (row) =>
    ok(row.id ? await supabase.from("capital_applications").update(row).eq("id", row.id).select().single()
              : await supabase.from("capital_applications").insert(row).select().single()),
  decideCapital: async (id, status, note) => ok(await supabase.rpc("decide_capital", { p_id: id, p_status: status, p_note: note ?? null })),
  deleteCapital: async (id) => ok(await supabase.from("capital_applications").delete().eq("id", id)),
  getPayout: async (tenantId) => ok(await supabase.from("payout_accounts").select("*").eq("tenant_id", tenantId).maybeSingle()),
  savePayout: async (row) => ok(await supabase.from("payout_accounts").upsert({ ...row, updated_at: new Date().toISOString() })),
  listHermes: async (tenantId) =>
    ok(await supabase.from("hermes_events").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(100)),
};

// ───────── FASE 2 · akses generik (RLS tetap penjaga utama) ─────────
Object.assign(api, {
  async list(table, { select = "*", eq = {}, inList, order, limit } = {}) {
    let q = supabase.from(table).select(select);
    for (const [k, v] of Object.entries(eq)) if (v !== undefined && v !== null && v !== "") q = q.eq(k, v);
    if (inList) q = q.in(inList[0], inList[1]);
    if (order) q = q.order(order[0], { ascending: order[1] !== "desc" });
    if (limit) q = q.limit(limit);
    return ok(await q);
  },
  insert: async (table, row) => ok(await supabase.from(table).insert(row).select().single()),
  update: async (table, id, patch, key = "id") => ok(await supabase.from(table).update(patch).eq(key, id).select().maybeSingle()),
  remove: async (table, id, key = "id") => ok(await supabase.from(table).delete().eq(key, id)),
  rpc: async (name, args = {}) => ok(await supabase.rpc(name, args)),
  subscribe(table, filter, cb) {
    const ch = supabase
      .channel(`rt-${table}-${filter ?? "all"}-${Math.random().toString(36).slice(2, 7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table, ...(filter ? { filter } : {}) }, cb)
      .subscribe();
    return () => supabase.removeChannel(ch);
  },
  // Unggah foto (nota kas kecil, selfie absen) ke bucket privat; path diawali tenant_id untuk policy Storage.
  async upload(bucket, file) {
    const { data: u } = await supabase.auth.getUser();
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", u.user.id).single();
    const path = `${p.tenant_id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    ok(await supabase.storage.from(bucket).upload(path, file, { upsert: false }));
    return path;
  },
  // Katalog ICD dari database (subset bawaan; bisa diganti katalog resmi lengkap tanpa ubah kode).
  async searchIcd(system, q, limit = 12) {
    let x = supabase.from("icd_codes").select("system, code, display, label:label_id").eq("system", system).order("code").limit(limit);
    const t = q.trim().replace(/[%,()]/g, "");
    if (t) x = x.or(`code.ilike.${t}%,display.ilike.%${t}%,label_id.ilike.%${t}%`);
    return ok(await x);
  },
  /** Edge Function owner-copilot: kuota, snapshot, dan log dikerjakan di server. */
  async copilotAsk(question) {
    const { data, error } = await supabase.functions.invoke("owner-copilot", { body: { question } });
    if (error) {
      let msg = error.message;
      try { const j = await error.context?.json?.(); if (j?.error) msg = j.error; } catch { /* pakai pesan bawaan */ }
      throw new Error(msg);
    }
    return data;
  },
  // QRIS dinamis: pembuatan QR lewat Edge Function qris-charge (bicara ke penyedia); status dan batal lewat RPC.
  async qrisCreate(orderId) {
    const { data, error } = await supabase.functions.invoke("qris-charge", { body: { action: "create", order_id: orderId } });
    if (error) throw await fnError(error);
    return data.charge;
  },
  qrisStatus: async (chargeId) => ok(await supabase.rpc("qris_status", { p_charge: chargeId })),
  qrisCancel: async (chargeId) => ok(await supabase.rpc("qris_cancel", { p_charge: chargeId })),
  /** Hanya bila server QRIS_SIMULATE=1 (pengembangan). */
  async qrisSimulatePaid(chargeId) {
    const { data, error } = await supabase.functions.invoke("qris-charge", { body: { action: "simulate_paid", charge_id: chargeId } });
    if (error) throw await fnError(error);
    return data;
  },
  // Masuk Member: Edge Function member-auth (publik). Kode Masuk lewat WhatsApp; sesi dibuat setelah kode benar.
  async memberRequestCode({ tenantSlug, phone, deviceId, consentData, consentMarketing }) {
    const { data, error } = await supabase.functions.invoke("member-auth", {
      body: { action: "request", tenant_slug: tenantSlug, phone, device_id: deviceId, consent_data: consentData === true, consent_marketing: consentMarketing === true },
    });
    if (error) throw await fnError(error);
    return data; // { sent, simulated, expires_at, dev_code? } — dev_code hanya ada bila server memang dalam mode simulasi
  },
  async memberVerifyCode({ tenantSlug, phone, deviceId, code, name }) {
    const { data, error } = await supabase.functions.invoke("member-auth", {
      body: { action: "verify", tenant_slug: tenantSlug, phone, device_id: deviceId, code, name },
    });
    if (error) throw await fnError(error);
    const { error: aerr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: data.type });
    if (aerr) throw new Error(aerr.message);
    return { is_new: data.is_new, points: data.points };
  },
  // FASE 1 · status akses (akun nonaktif / tenant ditangguhkan), presence, dan pengiriman undangan.
  accessState: async () => ok(await supabase.rpc("my_access_state")),
  touchPresence: async (login = false) => ok(await supabase.rpc("touch_presence", { p_login: login })),
  /** Edge Function invite-member: wewenang diperiksa database; service role hanya dipakai setelah lolos. */
  async sendInvite(inviteId) {
    const { data, error } = await supabase.functions.invoke("invite-member", { body: { invite_id: inviteId } });
    if (error) {
      let msg = error.message;
      try { const j = await error.context?.json?.(); if (j?.error) msg = j.error; } catch { /* pakai pesan bawaan */ }
      throw new Error(msg);
    }
    return data;
  },
  // Kunci meja saat pembayaran (Upstash via Edge Function). Gagal kunci = meja sedang diproses kasir lain.
  async lockTable(branchId, tableId, action = "acquire") {
    if (!tableId) return { locked: true };
    const { data, error } = await supabase.functions.invoke("table-lock", { body: { action, branch_id: branchId, table: tableId } });
    if (error) return { locked: true, degraded: true }; // Edge Function belum di-deploy: lanjut tanpa kunci
    return data;
  },

  // FASE 1.4 · Policy Builder 3 Lapis
  getEffectivePolicy: async ({ tenantId, branchId, role } = {}) =>
    ok(await supabase.rpc("get_effective_policy", { p_tenant: tenantId ?? null, p_branch: branchId ?? null, p_role: role ?? null })),
  listTenantPolicies: async (tenantId) =>
    ok(await supabase.from("tenant_policies").select("*, branch:branches(name)").eq("tenant_id", tenantId).order("updated_at", { ascending: false })),
  saveTenantPolicy: async ({ tenantId, branchId, role, discount, voidLimit, start, end, radius, lock }) =>
    ok(await supabase.rpc("save_tenant_policy", {
      p_tenant: tenantId ?? null, p_branch: branchId ?? null, p_role: role ?? null,
      p_discount: discount, p_void: voidLimit, p_start: start, p_end: end, p_radius: radius, p_lock: lock
    })),

  // FASE 1.6 · Akses Dukungan Bersyarat (Break-Glass)
  requestSupportSession: async ({ tenantId, ticketId, reason, hours = 2 }) =>
    ok(await supabase.rpc("request_support_session", { p_tenant: tenantId, p_ticket_id: ticketId ?? null, p_reason: reason, p_hours: hours })),
  grantSupportSession: async (sessionId, grant) =>
    ok(await supabase.rpc("grant_support_session", { p_session: sessionId, p_grant: grant })),
  revokeSupportSession: async (sessionId) =>
    ok(await supabase.rpc("revoke_support_session", { p_session: sessionId })),
  getActiveSupportSession: async (tenantId) =>
    ok(await supabase.rpc("get_active_support_session", { p_tenant: tenantId ?? null })),
  listSupportSessions: async (tenantId) => {
    let q = supabase.from("support_sessions").select("*, requester:profiles!requested_by(full_name, email), approver:profiles!approved_by(full_name, email)").order("created_at", { ascending: false });
    if (tenantId) q = q.eq("tenant_id", tenantId);
    return ok(await q);
  },

  // FASE 2 · Merek & Portal Member (tenant_branding)
  getTenantBranding: async (tenantId) =>
    ok(await supabase.from("tenant_branding").select("*").eq("tenant_id", tenantId).maybeSingle()),
  saveTenantBranding: async ({ tenantId, displayName, accentColor, logoUrl, welcomeText }) =>
    ok(await supabase.from("tenant_branding").upsert({
      tenant_id: tenantId,
      display_name: displayName?.trim() || null,
      accent_color: accentColor || null,
      logo_url: logoUrl || null,
      welcome_text: welcomeText || null,
      updated_at: new Date().toISOString(),
    }).select().single()),
});

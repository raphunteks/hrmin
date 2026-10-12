// Proxy ke 9router (OpenAI-compatible /v1/chat/completions). API key tidak pernah sampai ke browser.
// Secret: NINEROUTER_API_KEY. Konfigurasi non-rahasia: platform_settings.ai_gateway.
// CATATAN: base_url 127.0.0.1 hanya valid bila function berjalan satu host dengan 9router.
// Di Supabase cloud, isi base_url dengan endpoint publik/privat 9router yang dilindungi API key.
import { json, corsHeaders } from "../_shared/cors.ts";
import { userContext, admin } from "../_shared/auth.ts";
import { rateLimit } from "../_shared/redis.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  const ctx = await userContext(req);
  if (!ctx) return json(req, { error: "Tidak terautentikasi" }, 401);
  const { profile } = ctx;

  if (!(await rateLimit(`ai:${profile.tenant_id ?? "platform"}`, 30, 60))) {
    return json(req, { error: "Kuota AI per menit habis" }, 429);
  }

  const sb = admin();
  const { data: setting } = await sb.from("platform_settings").select("value").eq("key", "ai_gateway").single();
  const cfg = setting?.value ?? {};
  if (profile.tenant_id) {
    const { data: integ } = await sb.from("tenant_integrations").select("ai_enabled").eq("tenant_id", profile.tenant_id).single();
    if (!integ?.ai_enabled) return json(req, { error: "AI belum diaktifkan untuk tenant ini" }, 403);
  }

  if (profile.tenant_id) {
    const { data: quota } = await sb.rpc("ai_quota_check", { p_tenant: profile.tenant_id });
    if (quota && quota.allowed === false) return json(req, { error: "Kuota token AI bulan ini habis", used: quota.used, quota: quota.quota }, 402);
  }

  const key = Deno.env.get(cfg.secret_name ?? "NINEROUTER_API_KEY");
  if (!key) return json(req, { error: "API key 9router belum diset sebagai secret" }, 500);

  const { messages, model } = await req.json().catch(() => ({}));
  if (!Array.isArray(messages) || messages.length === 0) return json(req, { error: "messages wajib" }, 400);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeout_ms ?? 20000);
  try {
    const res = await fetch(`${cfg.base_url}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: model ?? cfg.default_model ?? "auto", messages }),
    });
    const data = await res.json();
    if (profile.tenant_id) await sb.rpc("ai_record_usage", { p_tenant: profile.tenant_id, p_tokens: data?.usage?.total_tokens ?? 0 });
    await sb.from("audit_logs").insert({
      tenant_id: profile.tenant_id, actor_id: profile.id, actor_role: profile.role,
      action: "ai_call", entity: "ai_gateway", detail: { status: res.status, model: data?.model ?? null },
    });
    return json(req, data, res.status);
  } catch (e) {
    return json(req, { error: `9router tidak terjangkau: ${(e as Error).message}` }, 502);
  } finally {
    clearTimeout(timer);
  }
});

// AI Copilot Owner: database menyiapkan FAKTA (copilot_snapshot, dibatasi RLS + peran Owner); model hanya merangkum.
// Alur: JWT Owner → copilot_snapshot() → 9router (lewat konfigurasi yang sama dengan ai-gateway) → jawaban + log.
// Model dilarang mengarang angka: seluruh angka harus berasal dari snapshot. Tidak ada PII pelanggan/pasien di snapshot.
import { json, corsHeaders } from "../_shared/cors.ts";
import { userContext, admin } from "../_shared/auth.ts";
import { rateLimit } from "../_shared/redis.ts";

const SYSTEM = `Anda analis bisnis untuk pemilik usaha. Jawab singkat dalam Bahasa Indonesia.
Gunakan HANYA angka pada DATA. Jika data tidak cukup, katakan tidak tahu. Jangan memberi saran hukum/pajak/medis.
Tandai asumsi, dan beri maksimal 3 tindakan konkret.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  const ctx = await userContext(req);
  if (!ctx) return json(req, { error: "Tidak terautentikasi" }, 401);
  const { db, profile } = ctx;
  if (profile.role !== "owner") return json(req, { error: "Copilot hanya untuk Owner" }, 403);
  try {
    if (!(await rateLimit(`copilot:${profile.id}`, 10, 60))) return json(req, { error: "Terlalu banyak pertanyaan, coba lagi sebentar" }, 429);
  } catch { /* Upstash belum dikonfigurasi: lanjut */ }

  const { question } = await req.json().catch(() => ({}));
  if (typeof question !== "string" || question.trim().length < 3 || question.length > 1000) return json(req, { error: "Pertanyaan 3–1000 karakter" }, 400);

  const sb = admin();
  const { data: integ } = await sb.from("tenant_integrations").select("ai_enabled").eq("tenant_id", profile.tenant_id).maybeSingle();
  if (!integ?.ai_enabled) return json(req, { error: "AI belum diaktifkan untuk tenant ini" }, 403);

  const { data: quota } = await sb.rpc("ai_quota_check", { p_tenant: profile.tenant_id });
  if (quota && quota.allowed === false) return json(req, { error: "Kuota token AI bulan ini habis", used: quota.used, quota: quota.quota }, 402);

  const { data: snap, error: e1 } = await db.rpc("copilot_snapshot");
  if (e1) return json(req, { error: e1.message }, 400);

  const { data: setting } = await sb.from("platform_settings").select("value").eq("key", "ai_gateway").single();
  const cfg = setting?.value ?? {};
  const key = Deno.env.get(cfg.secret_name ?? "NINEROUTER_API_KEY");
  if (!key) return json(req, { error: "API key 9router belum diset sebagai secret" }, 500);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeout_ms ?? 20000);
  try {
    const res = await fetch(`${cfg.base_url}/chat/completions`, {
      method: "POST", signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: cfg.default_model ?? "auto", messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `DATA:\n${JSON.stringify(snap)}\n\nPERTANYAAN: ${question.trim()}` },
      ] }),
    });
    const data = await res.json();
    const answer: string = data?.choices?.[0]?.message?.content ?? "";
    if (!res.ok || !answer) return json(req, { error: "Model tidak memberi jawaban" }, 502);
    await sb.rpc("ai_record_usage", { p_tenant: profile.tenant_id, p_tokens: data?.usage?.total_tokens ?? 0 });
    await db.rpc("log_copilot", { p_question: question.trim(), p_answer: answer, p_tokens: data?.usage?.total_tokens ?? null });
    return json(req, { answer, snapshot_at: snap?.generated_at });
  } catch (e) {
    return json(req, { error: `9router tidak terjangkau: ${(e as Error).message}` }, 502);
  } finally {
    clearTimeout(timer);
  }
});

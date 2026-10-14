import { useState } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { dateTime } from "../../../lib/format.js";
import { PageHead, Panel, Loading, ErrorNote, Empty, Field, Stat, useAsync } from "../../ui/index.jsx";
import { useAction, Feedback, useLive } from "../../ops.jsx";

const IDEAS = [
  "Cabang mana yang paling perlu perhatian bulan ini?",
  "Menu apa yang sebaiknya dievaluasi?",
  "Apakah kas saya aman 30 hari ke depan?",
];

export default function Copilot() {
  const { api, tenantId } = useAuth();
  const [q, setQ] = useState("");
  const [ans, setAns] = useState(null);
  const [copied, setCopied] = useState(false);
  const a = useAction();
  const logs = useAsync(
    () => api.list("copilot_logs", { eq: { tenant_id: tenantId }, order: ["created_at", "desc"], limit: 20 }),
    [api, tenantId]
  );
  const use = useAsync(() => api.rpc("ai_usage_summary"), [api, tenantId]);
  useLive(["copilot_logs"], () => {
    logs.reload();
    use.reload();
  });

  const ask = () => {
    if (!q.trim() || a.busy) return;
    return a.run(async () => {
      const r = await api.copilotAsk(q.trim());
      setAns(r);
      setQ("");
      setCopied(false);
      logs.reload();
      use.reload();
    }, "Analisis Copilot selesai");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
      e.preventDefault();
      ask();
    }
  };

  const copyAnswer = () => {
    if (!ans?.answer) return;
    navigator.clipboard?.writeText(ans.answer).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <>
      <PageHead
        eyebrow="Fitur 2 · Owner Copilot"
        title="Owner Copilot"
        desc="Tanya soal bisnis Anda. Jawaban hanya memakai ringkasan angka (KPI, menu, kas, stok, void) — bukan data pelanggan atau nama karyawan. Didukung 9router AI Engine."
      />
      <div className="d-grid">
        {use.data && (
          <div className="d-stats d-stats--3">
            <Stat
              label="Token bulan ini"
              value={Number(use.data.tokens).toLocaleString("id-ID")}
              sub={use.data.quota == null ? "Tanpa batas" : `Kuota ${Number(use.data.quota).toLocaleString("id-ID")}`}
            />
            <Stat label="Pertanyaan" value={use.data.calls} sub="Bulan berjalan (UTC)" />
            <Stat
              label="Terpakai"
              value={use.data.pct == null ? "—" : `${use.data.pct}%`}
              sub="Batas lunak; peringatan di 402"
            />
          </div>
        )}

        <Panel title="Tanya Copilot">
          <div className="d-form">
            <div className="d-chips" role="group" aria-label="Contoh pertanyaan">
              {IDEAS.map((i) => (
                <button key={i} type="button" className="d-chip" onClick={() => setQ(i)}>
                  {i}
                </button>
              ))}
            </div>
            <Field label="Pertanyaan (tekan Enter untuk mengirim)" id="cp-q">
              <textarea
                id="cp-q"
                rows="3"
                maxLength={1000}
                placeholder="Tulis pertanyaan seputar performa cabang, menu terlaris, kas, atau rekomendasi tindakan..."
                value={q}
                disabled={a.busy}
                onKeyDown={handleKeyDown}
                onChange={(e) => setQ(e.target.value)}
              />
            </Field>
            <div className="d-form__actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="d-muted" style={{ fontSize: "0.8125rem" }}>
                {a.busy ? "Sedang menganalisis snapshot database..." : "Enter atau Ctrl+Enter untuk kirim"}
              </span>
              <button
                type="button"
                className="d-btn d-btn--primary"
                disabled={a.busy || q.trim().length < 3}
                onClick={ask}
              >
                {a.busy ? "Menganalisis…" : "Tanya"}
              </button>
            </div>
            <Feedback a={a} />
          </div>

          {ans && (
            <div className="d-note" role="status" style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <strong>Analisis Bisnis</strong>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  {ans.model && (
                    <span className="d-role-chip d-role-chip--plain" style={{ fontSize: "0.75rem" }}>
                      Model: {ans.model}
                    </span>
                  )}
                  <button
                    type="button"
                    className="d-btn d-btn--subtle"
                    style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                    onClick={copyAnswer}
                  >
                    {copied ? "✓ Tersalin" : "Salin Jawaban"}
                  </button>
                </div>
              </div>
              <p className="d-text" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {ans.answer}
              </p>
              {ans.snapshot_at && (
                <p className="d-muted" style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}>
                  Data per {dateTime(ans.snapshot_at)} · Sumber: snapshot metrik terukur sistem Harum.in
                </p>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Riwayat Analisis">
          {logs.loading && !logs.data ? (
            <Loading />
          ) : logs.error ? (
            <ErrorNote error={logs.error} onRetry={logs.reload} />
          ) : logs.data.length === 0 ? (
            <Empty title="Belum ada pertanyaan" />
          ) : (
            <ul className="d-list">
              {logs.data.map((l) => (
                <li key={l.id} style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="d-list__title" style={{ fontWeight: 600 }}>{l.question}</div>
                    <button
                      type="button"
                      className="d-btn d-btn--subtle"
                      style={{ padding: "0.15rem 0.4rem", fontSize: "0.75rem" }}
                      onClick={() => setQ(l.question)}
                      title="Gunakan pertanyaan ini lagi"
                    >
                      Tanya Ulang
                    </button>
                  </div>
                  <div className="d-list__meta">
                    {dateTime(l.created_at)}
                    {l.tokens ? ` · ${l.tokens.toLocaleString("id-ID")} token` : ""}
                  </div>
                  <p className="d-text" style={{ whiteSpace: "pre-wrap", marginTop: "0.35rem", lineHeight: 1.5 }}>
                    {l.answer}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

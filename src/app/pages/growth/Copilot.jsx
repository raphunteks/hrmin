import { useState } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { dateTime } from "../../../lib/format.js";
import { PageHead, Panel, Loading, ErrorNote, Empty, Field, Stat, useAsync } from "../../ui/index.jsx";
import { useAction, Feedback, useLive } from "../../ops.jsx";

const IDEAS = ["Cabang mana yang paling perlu perhatian bulan ini?", "Menu apa yang sebaiknya dievaluasi?", "Apakah kas saya aman 30 hari ke depan?"];

export default function Copilot() {
  const { api, tenantId } = useAuth();
  const [q, setQ] = useState("");
  const [ans, setAns] = useState(null);
  const a = useAction();
  const logs = useAsync(() => api.list("copilot_logs", { eq: { tenant_id: tenantId }, order: ["created_at", "desc"], limit: 20 }), [api, tenantId]);
  const use = useAsync(() => api.rpc("ai_usage_summary"), [api, tenantId]);
  useLive(["copilot_logs"], () => { logs.reload(); use.reload(); });
  const ask = () => a.run(async () => { const r = await api.copilotAsk(q.trim()); setAns(r); setQ(""); logs.reload(); use.reload(); });
  return (
    <>
      <PageHead eyebrow="Fitur 2 · Owner Copilot" title="Owner Copilot" desc="Tanya soal bisnis Anda. Jawaban hanya memakai ringkasan angka (KPI, menu, kas, stok, void) — bukan data pelanggan atau nama karyawan. Ini bantuan analisis, bukan nasihat keuangan." />
      <div className="d-grid">
        {use.data && <div className="d-stats d-stats--3">
          <Stat label="Token bulan ini" value={Number(use.data.tokens).toLocaleString("id-ID")} sub={use.data.quota == null ? "Tanpa batas" : `Kuota ${Number(use.data.quota).toLocaleString("id-ID")}`} />
          <Stat label="Pertanyaan" value={use.data.calls} sub="Bulan berjalan (UTC)" />
          <Stat label="Terpakai" value={use.data.pct == null ? "—" : `${use.data.pct}%`} sub="Batas lunak; peringatan di 402" />
        </div>}
        <Panel title="Tanya Copilot">
          <div className="d-form">
            <div className="d-chips" role="group" aria-label="Contoh pertanyaan">{IDEAS.map((i) => <button key={i} type="button" className="d-chip" onClick={() => setQ(i)}>{i}</button>)}</div>
            <Field label="Pertanyaan" id="cp-q"><textarea id="cp-q" rows="3" maxLength={1000} value={q} onChange={(e) => setQ(e.target.value)} /></Field>
            <div className="d-form__actions"><button type="button" className="d-btn d-btn--primary" disabled={a.busy || q.trim().length < 3} onClick={ask}>{a.busy ? "Menganalisis…" : "Tanya"}</button></div>
            <Feedback a={a} />
          </div>
          {ans && <div className="d-note" role="status"><strong>Jawaban</strong><p className="d-text" style={{ whiteSpace: "pre-wrap" }}>{ans.answer}</p>{ans.snapshot_at && <p className="d-muted">Data per {dateTime(ans.snapshot_at)}</p>}</div>}
        </Panel>
        <Panel title="Riwayat">
          {logs.loading && !logs.data ? <Loading /> : logs.error ? <ErrorNote error={logs.error} onRetry={logs.reload} /> : logs.data.length === 0 ? <Empty title="Belum ada pertanyaan" /> : (
            <ul className="d-list">{logs.data.map((l) => <li key={l.id}><div className="d-list__title">{l.question}</div><div className="d-list__meta">{dateTime(l.created_at)}{l.tokens ? ` · ${l.tokens} token` : ""}</div><p className="d-text" style={{ whiteSpace: "pre-wrap" }}>{l.answer}</p></li>)}</ul>
          )}
        </Panel>
      </div>
    </>
  );
}

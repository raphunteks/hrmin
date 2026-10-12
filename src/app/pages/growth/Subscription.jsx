import { useState } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { rupiah, date } from "../../../lib/format.js";
import { PageHead, Panel, Stat, Loading, ErrorNote, Empty, Badge, useAsync } from "../../ui/index.jsx";
import { useAction, Feedback, useLive } from "../../ops.jsx";

const MET = { avg_ticket: ["Rata-rata struk", rupiah], cogs_pct: ["HPP %", (v) => `${v}%`], void_pct: ["Void %", (v) => `${v}%`], discount_pct: ["Diskon %", (v) => `${v}%`], revenue_per_branch: ["Omzet per cabang", rupiah] };

function Billing() {
  const { api, tenantId } = useAuth();
  const q = useAsync(async () => ({ b: await api.rpc("billing_status"), inv: (await api.listInvoices().catch(() => [])).filter((i) => i.tenant_id === tenantId).sort((a, b) => String(b.period).localeCompare(String(a.period))) }), [api, tenantId]);
  return (
    <Panel title="Tagihan langganan">
      {q.loading && !q.data ? <Loading /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : (
        <>
          <div className="d-stats d-stats--3">
            <Stat label="Status akun" value={{ active: "Aktif", trial: "Uji coba", past_due: "Menunggak", suspended: "Ditangguhkan" }[q.data.b.status] ?? q.data.b.status} sub={q.data.b.period_end ? `Periode sampai ${date(q.data.b.period_end)}` : ""} />
            <Stat label="Tagihan belum lunas" value={q.data.b.unpaid.length} sub={q.data.b.unpaid.length ? `Total ${rupiah(q.data.b.unpaid.reduce((s, i) => s + i.amount, 0))}` : "Tidak ada"} />
          </div>
          {q.data.b.unpaid.map((i) => (
            <p key={i.id} className={`d-note${i.days_overdue > 0 ? " d-note--warn" : ""}`}>Tagihan {String(i.period).slice(0, 7)} · {rupiah(i.amount)} · jatuh tempo {date(i.due)}{i.days_overdue > 0 ? ` (terlambat ${i.days_overdue} hari; penangguhan ${date(i.suspend_on)})` : ""}. Pembayaran dikonfirmasi tim Harum.in setelah transfer diterima.</p>
          ))}
          {q.data.inv.length === 0 ? <Empty title="Belum ada tagihan" /> : (
            <div className="d-table-wrap"><table className="d-table d-table--fin"><thead><tr><th scope="col">Periode</th><th scope="col" className="d-num">Jumlah</th><th scope="col">Status</th></tr></thead>
              <tbody>{q.data.inv.map((i) => <tr key={i.id}><td>{String(i.period).slice(0, 7)}</td><td className="d-num">{rupiah(i.amount)}</td><td><Badge tone={i.status === "paid" ? "ok" : i.status === "void" ? "neutral" : "warn"}>{{ paid: "Lunas", unpaid: "Belum lunas", void: "Dibatalkan" }[i.status] ?? i.status}</Badge></td></tr>)}</tbody></table></div>
          )}
        </>
      )}
    </Panel>
  );
}

function Benchmark() {
  const { api, tenant } = useAuth();
  const [on, setOn] = useState(null);
  const a = useAction();
  const q = useAsync(() => api.rpc("my_benchmark"), [api, on]);
  const optIn = (v) => a.run(async () => { await api.rpc("set_benchmark_opt_in", { p_on: v }); setOn(v); });
  return (
    <Panel title="Benchmark anonim" meta="Kohort ≥ 5 tenant sejenis">
      <p className="d-text d-muted">Bandingkan angka Anda dengan median tenant sejenis tanpa membuka identitas siapa pun. Anda hanya bisa melihat setelah ikut berbagi ringkasan bulanan (tanpa nama, tanpa data pelanggan); bisa dicabut kapan saja.</p>
      <div className="d-form__actions">
        <button type="button" className="d-btn d-btn--ghost" disabled={a.busy} onClick={() => optIn(true)}>Ikut serta</button>
        <button type="button" className="d-btn d-btn--ghost" disabled={a.busy} onClick={() => optIn(false)}>Berhenti</button>
      </div>
      <Feedback a={a} />
      {q.loading && !q.data ? <Loading /> : q.error ? <ErrorNote error={q.error} onRetry={q.reload} /> : !q.data.available ? <p className="d-note">{q.data.reason}</p> : (
        <div className="d-table-wrap"><table className="d-table d-table--fin">
          <caption className="sr-only">Benchmark {q.data.month}</caption>
          <thead><tr><th scope="col">Metrik ({String(q.data.month).slice(0, 7)})</th><th scope="col" className="d-num">Anda</th><th scope="col" className="d-num">P25</th><th scope="col" className="d-num">Median</th><th scope="col" className="d-num">P75</th><th scope="col" className="d-num">Peringkat</th></tr></thead>
          <tbody>{Object.entries(q.data.metrics).map(([k, m]) => { const [l, f] = MET[k] ?? [k, String]; return <tr key={k}><td>{l}</td><td className="d-num"><strong>{f(m.mine)}</strong></td><td className="d-num">{f(m.p25)}</td><td className="d-num">{f(m.median)}</td><td className="d-num">{f(m.p75)}</td><td className="d-num">{m.rank_pct == null ? "—" : `${m.rank_pct}%`}</td></tr>; })}</tbody>
        </table></div>
      )}
    </Panel>
  );
}

function Templates() {
  const { api } = useAuth();
  const a = useAction();
  const t = useAsync(() => api.list("industry_templates"), [api]);
  return (
    <Panel title="Template industri" meta="Terapkan sekali; aman diulang">
      <p className="d-text d-muted">Menambahkan menu contoh, checklist, dan jadwal laporan yang umum untuk jenis usaha Anda. Tidak menimpa data yang sudah ada.</p>
      {t.loading && !t.data ? <Loading /> : t.error ? <ErrorNote error={t.error} /> : (
        <ul className="d-list">{t.data.map((x) => (
          <li key={x.key}><div className="d-list__title">{x.name}</div>
            <div className="d-row-actions"><button type="button" className="d-btn d-btn--ghost d-btn--sm" disabled={a.busy} onClick={() => a.run(() => api.rpc("apply_industry_template", { p_key: x.key, p_apply_settings: false }), (r) => `Diterapkan: ${r.products} menu, ${r.checklists} checklist, ${r.reports} laporan baru`)}>Terapkan</button></div></li>
        ))}</ul>
      )}
      <Feedback a={a} />
    </Panel>
  );
}

export default function Subscription() {
  const { api, tenantId } = useAuth();
  const ai = useAsync(() => api.rpc("ai_usage_summary"), [api, tenantId]);
  const fl = useAsync(() => api.rpc("my_flags"), [api, tenantId]);
  useLive(["tenants", "invoices"], ai.reload);
  return (
    <>
      <PageHead eyebrow="Langganan" title="Langganan, kuota AI & fitur" desc="Tagihan, pemakaian AI, benchmark, dan template industri untuk tenant Anda." />
      <div className="d-grid">
        <Billing />
        <Panel title="Kuota AI bulan ini">
          {ai.loading && !ai.data ? <Loading /> : ai.error ? <ErrorNote error={ai.error} onRetry={ai.reload} /> : (
            <div className="d-stats d-stats--3">
              <Stat label="Token terpakai" value={Number(ai.data.tokens).toLocaleString("id-ID")} sub={`${ai.data.calls} panggilan`} />
              <Stat label="Kuota" value={ai.data.quota == null ? "Tanpa batas" : Number(ai.data.quota).toLocaleString("id-ID")} sub="Paket + tambahan Superadmin" />
              <Stat label="Terpakai" value={ai.data.pct == null ? "—" : `${ai.data.pct}%`} />
            </div>
          )}
        </Panel>
        <Panel title="Fitur aktif untuk paket Anda">
          {fl.loading && !fl.data ? <Loading /> : fl.error ? <ErrorNote error={fl.error} /> : <div className="d-chips">{Object.entries(fl.data).map(([k, v]) => <Badge key={k} tone={v ? "ok" : "neutral"}>{k}: {v ? "aktif" : "tidak"}</Badge>)}</div>}
        </Panel>
        <Benchmark />
        <Templates />
      </div>
    </>
  );
}

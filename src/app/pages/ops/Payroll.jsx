import { printPayslip } from "../../../lib/payslip.js";
import { useState } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { can, permOf } from "../../../lib/rbac.js";
import { rupiah } from "../../../lib/format.js";
import { PageHead, Panel, Loading, ErrorNote, useAsync, Badge, Empty, Field } from "../../ui/index.jsx";
import { useAction, Feedback, useIndex } from "../../ops.jsx";

const ST = { draft: ["Draf", "neutral"], pending: ["Menunggu Owner", "warn"], approved: ["Disahkan", "ok"], rejected: ["Ditolak", "danger"] };
const COLS = [["base", "Pokok"], ["allowance", "Tunjangan"], ["overtime", "Lembur"], ["commission", "Komisi"], ["late_penalty", "Denda telat"], ["kasbon", "Kasbon"]];
const net = (l) => Number(l.base) + Number(l.allowance) + Number(l.overtime) + Number(l.commission) - Number(l.late_penalty) - Number(l.kasbon);

export default function Payroll() {
  const { api, role, tenantId, profile, tenant } = useAuth();
  const [sel, setSel] = useState(null);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const r = useAsync(async () => {
    const [runs, lines, people, loans] = await Promise.all([
      api.list("payroll_runs", { eq: { tenant_id: tenantId }, order: ["period", "desc"] }),
      api.list("payroll_lines", { eq: { tenant_id: tenantId } }),
      api.list("profiles", { eq: { tenant_id: tenantId } }),
      api.list("staff_loans", { eq: { tenant_id: tenantId }, order: ["created_at", "desc"] }).catch(() => []),
    ]);
    return { runs, lines, people, loans };
  }, [api, tenantId]);
  const a = useAction();
  const [lf, setLf] = useState({ profile_id: "", amount: "", installments: "4", note: "" });
  const ppl = useIndex(r.data?.people);
  const run = r.data?.runs.find((x) => x.id === (sel ?? r.data?.runs[0]?.id));
  const lines = run ? r.data.lines.filter((l) => l.run_id === run.id) : [];
  const editable = run && ["draft", "rejected"].includes(run.status) && can(role, 14, "u");
  const setCell = (l, k, v) => a.run(async () => { await api.update("payroll_lines", l.id, { [k]: Number(v) || 0 }); r.reload(); });

  const loansPanel = r.data ? (
        <Panel title="Kasbon karyawan" meta="Dipotong otomatis di payroll, tertua dulu">
            {can(role, 14, "c") && (
              <div className="d-form" style={{ marginBottom: "1rem" }}>
                <Field label="Karyawan" id="ln-p"><select id="ln-p" value={lf.profile_id} onChange={(e) => setLf({ ...lf, profile_id: e.target.value })}>
                  <option value="">Pilih karyawan…</option>
                  {r.data.people.filter((x) => ["gm", "staff", "dokter"].includes(x.role) && x.is_active !== false && x.id !== profile?.id && !(role === "gm" && x.role === "gm")).map((x) => <option key={x.id} value={x.id}>{x.full_name} · {x.role}</option>)}
                </select></Field>
                <Field label="Nominal (Rp)" id="ln-a"><input id="ln-a" inputMode="numeric" value={lf.amount} onChange={(e) => setLf({ ...lf, amount: e.target.value.replace(/\D/g, "") })} /></Field>
                <Field label="Cicilan (bulan)" id="ln-i" hint="Maksimal total kasbon berjalan mengikuti pengaturan tenant (× gaji pokok)."><input id="ln-i" type="number" min="1" max="24" value={lf.installments} onChange={(e) => setLf({ ...lf, installments: e.target.value })} /></Field>
                <Field label="Catatan" id="ln-n"><input id="ln-n" value={lf.note} onChange={(e) => setLf({ ...lf, note: e.target.value })} /></Field>
                <button type="button" className="d-btn d-btn--primary" disabled={a.busy || !lf.profile_id || !lf.amount}
                  onClick={() => a.run(async () => { await api.rpc("grant_loan", { p_profile: lf.profile_id, p_amount: Number(lf.amount), p_installments: Number(lf.installments) || 1, p_note: lf.note || null }); setLf({ profile_id: "", amount: "", installments: "4", note: "" }); r.reload(); }, "Kasbon dicatat dan dijurnal")}>Catat kasbon</button>
              </div>
            )}
            {r.data.loans.length === 0 ? <Empty title="Belum ada kasbon" /> : (
              <ul className="d-list">{r.data.loans.map((l) => (
                <li key={l.id}>
                  <div><p className="d-list__title">{ppl[l.profile_id]?.full_name} · {rupiah(l.amount)} / {l.installments} bln</p>
                    <p className="d-list__meta">Cicilan {rupiah(l.monthly)} · sisa {rupiah(l.remaining)}{l.note && ` · ${l.note}`}</p></div>
                  <span className="d-row-actions">
                    <Badge tone={l.status === "active" ? "warn" : l.status === "paid" ? "ok" : "neutral"}>{{ active: "Berjalan", paid: "Lunas", cancelled: "Dibatalkan" }[l.status]}</Badge>
                    {l.status === "active" && Number(l.remaining) === Number(l.amount) && can(role, 14, "u") && (
                      <button type="button" className="d-btn d-btn--ghost d-btn--sm" disabled={a.busy} onClick={() => a.run(async () => { await api.rpc("cancel_loan", { p_loan: l.id }); r.reload(); }, "Kasbon dibatalkan")}>Batalkan</button>
                    )}
                  </span>
                </li>
              ))}</ul>
            )}
            <Feedback a={a} />
          </Panel>
  ) : null;

  return (
    <>
      <PageHead eyebrow={`Fitur 14 · ${permOf(role, 14)?.label}`} title="Payroll" desc="Disusun GM, disahkan Owner. Setelah disahkan, beban gaji dan utang gaji dijurnal otomatis."
        actions={can(role, 14, "c") && <>
          <input type="month" className="d-date" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Periode" />
          <button type="button" className="d-btn d-btn--primary" disabled={a.busy} onClick={() => a.run(async () => { const x = await api.rpc("create_payroll_run", { p_period: `${period}-01` }); setSel(x.id); r.reload(); }, "Payroll dibuat dari gaji pokok karyawan")}>Susun payroll</button>
        </>} />
      {r.loading ? <Loading /> : r.error ? <ErrorNote error={r.error} onRetry={r.reload} /> : r.data.runs.length === 0 ? <div className="d-grid"><Empty title="Belum ada payroll">Pilih periode lalu susun payroll.</Empty>{loansPanel}</div> : (
        <div className="d-grid">
          <div className="d-chips">{r.data.runs.map((x) => (
            <button key={x.id} type="button" className={`d-chip${run?.id === x.id ? " is-on" : ""}`} aria-pressed={run?.id === x.id} onClick={() => setSel(x.id)}>{x.period.slice(0, 7)} · {ST[x.status][0]}</button>
          ))}</div>
          {run && (
            <Panel title={`Periode ${run.period.slice(0, 7)}`} meta={ST[run.status][0]}
              actions={editable && <button type="button" className="d-btn d-btn--primary" disabled={a.busy} onClick={() => a.run(async () => { await api.rpc("submit_payroll", { p_run: run.id }); r.reload(); }, "Diajukan ke Owner untuk disahkan")}>Ajukan ke Owner</button>}>
              <div className="d-table-wrap"><table className="d-table">
                <thead><tr><th scope="col">Karyawan</th>{COLS.map(([k, l]) => <th key={k} scope="col" className="d-num">{l}</th>)}<th scope="col" className="d-num">Diterima</th><th scope="col"><span className="sr-only">Slip</span></th></tr></thead>
                <tbody>{lines.map((l) => (
                  <tr key={l.id}><td>{ppl[l.profile_id]?.full_name}</td>
                    {COLS.map(([k]) => <td key={k} className="d-num">{editable && k !== "kasbon" ? <input className="d-cell-input" inputMode="numeric" defaultValue={l[k]} aria-label={`${k} ${ppl[l.profile_id]?.full_name}`} onBlur={(e) => Number(e.target.value) !== Number(l[k]) && setCell(l, k, e.target.value)} /> : rupiah(l[k])}</td>)}
                    <td className="d-num"><strong>{rupiah(net(l))}</strong></td><td><button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={() => printPayslip({ tenant, employee: ppl[l.profile_id], period: run.period, line: l, status: ST[run.status][0] })}>Cetak slip</button></td></tr>
                ))}
                <tr className="is-total"><td>Total</td>{COLS.map(([k]) => <td key={k} />)}<td className="d-num"><strong>{rupiah(lines.reduce((s, l) => s + net(l), 0))}</strong></td><td /></tr></tbody>
              </table></div>
              <Feedback a={a} />
            </Panel>
          )}
          {loansPanel}
        </div>
      )}
    </>
  );
}

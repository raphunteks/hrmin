import { useState } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { can, permOf } from "../../../lib/rbac.js";
import { ROLE_LABEL } from "../../../lib/rbac-matrix.js";
import { rupiah, date, dateTime } from "../../../lib/format.js";
import { PageHead, Panel, Loading, ErrorNote, Modal, Field, useAsync, Empty } from "../../ui/index.jsx";
import { useAction, Feedback, useIndex, useBranch } from "../../ops.jsx";
import AssignBranches from "../service/AssignBranches.jsx";
import { branchesOfPerson } from "../service/shared.jsx";

export default function Staff() {
  const { api, role, tenantId } = useAuth();
  const r = useAsync(async () => {
    const [people, branches, shifts, att, mb] = await Promise.all([
      api.list("profiles", { eq: { tenant_id: tenantId }, order: ["full_name"] }),
      api.list("branches", { eq: { tenant_id: tenantId } }),
      api.list("work_shifts", { eq: { tenant_id: tenantId }, order: ["work_date"] }),
      api.list("attendance", { eq: { tenant_id: tenantId }, order: ["created_at", "desc"], limit: 30 }),
      api.list("member_branches", { eq: { tenant_id: tenantId } }).catch(() => []),
    ]);
    return { people, branches, shifts, att, mb };
  }, [api, tenantId]);
  const [ws, setWs] = useState(null);
  const [sal, setSal] = useState({});
  const [assign, setAssign] = useState(null); // { person, ids: Set }
  const mine = useBranch(); // cabang yang boleh ditugaskan oleh pengguna ini (GM terbatas → hanya cabangnya)
  const branchesOf = (p) => branchesOfPerson(p, r.data?.mb ?? []); // null = semua cabang
  const canAssign = (p) => can(role, 13, "u") && ["gm", "staff", "dokter"].includes(p.role) && !(role === "gm" && p.role === "gm");
  const a = useAction();
  const ppl = useIndex(r.data?.people), br = useIndex(r.data?.branches);
  return (
    <>
      <PageHead eyebrow={`Fitur 13 · ${permOf(role, 13)?.label}`} title="Karyawan & jadwal" desc="Akun karyawan dibuat lewat undangan Auth; peran Owner hanya bisa ditetapkan Superadmin."
        actions={can(role, 13, "c") && <button type="button" className="d-btn d-btn--primary" onClick={() => setWs({ profile_id: "", branch_id: r.data?.branches.find((x) => !x.is_warehouse)?.id, work_date: new Date().toISOString().slice(0, 10), start_time: "08:00", end_time: "16:00" })}>Tambah jadwal</button>} />
      {r.loading ? <Loading /> : r.error ? <ErrorNote error={r.error} onRetry={r.reload} /> : (
        <div className="d-grid">
          <Panel title="Karyawan">
            <div className="d-table-wrap"><table className="d-table">
              <thead><tr><th scope="col">Nama</th><th scope="col">Peran</th><th scope="col">Cabang</th><th scope="col" className="d-num">Gaji pokok</th></tr></thead>
              <tbody>{r.data.people.map((p) => (
                <tr key={p.id}><td>{p.full_name}<p className="d-list__meta">{p.email}</p></td><td>{ROLE_LABEL[p.role]}</td><td>
                  {(() => { const ids = branchesOf(p); return ids ? ids.map((id) => br[id]?.name).filter(Boolean).join(", ") || "—" : "Semua cabang"; })()}
                  {canAssign(p) && <button type="button" className="d-btn d-btn--ghost d-btn--sm d-cell-btn" onClick={() => setAssign({ person: p, ids: new Set(branchesOf(p) ?? []) })}>Atur cabang</button>}
                </td>
                  <td className="d-num">{can(role, 13, "u") && p.role !== "owner" ? (
                    <span className="d-row-actions">
                      <input className="d-cell-input" inputMode="numeric" aria-label={`Gaji pokok ${p.full_name}`} value={sal[p.id] ?? p.base_salary ?? 0} onChange={(e) => setSal({ ...sal, [p.id]: e.target.value.replace(/\D/g, "") })} />
                      {sal[p.id] !== undefined && <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={() => a.run(async () => { await api.update("profiles", p.id, { base_salary: Number(sal[p.id]) }); setSal((s) => { const n = { ...s }; delete n[p.id]; return n; }); r.reload(); }, "Gaji disimpan")}>Simpan</button>}
                    </span>
                  ) : rupiah(p.base_salary)}</td></tr>
              ))}</tbody>
            </table></div>
            <Feedback a={a} />
          </Panel>
          <div className="d-grid d-grid--2">
            <Panel title="Jadwal shift">
              {r.data.shifts.length === 0 ? <Empty title="Belum ada jadwal" /> : (
                <ul className="d-list">{r.data.shifts.map((s) => (
                  <li key={s.id}><div><p className="d-list__title">{ppl[s.profile_id]?.full_name}</p><p className="d-list__meta">{date(s.work_date)} · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · {br[s.branch_id]?.name}</p></div>
                    {can(role, 13, "d") && <button type="button" className="d-btn d-btn--danger-ghost d-btn--sm" onClick={() => a.run(async () => { await api.remove("work_shifts", s.id); r.reload(); })}>Hapus</button>}</li>
                ))}</ul>
              )}
            </Panel>
            <Panel title="Absensi terbaru">
              {r.data.att.length === 0 ? <Empty title="Belum ada absensi" /> : (
                <ul className="d-list">{r.data.att.map((x) => <li key={x.id}><div><p className="d-list__title">{ppl[x.profile_id]?.full_name} · {x.kind === "in" ? "Masuk" : "Pulang"}</p><p className="d-list__meta">{br[x.branch_id]?.name} · {dateTime(x.created_at)} · {x.distance_m} m</p></div></li>)}</ul>
              )}
            </Panel>
          </div>
        </div>
      )}
      <Modal open={Boolean(ws)} title="Tambah jadwal shift" onClose={() => setWs(null)}
        footer={<><button type="button" className="d-btn d-btn--ghost" onClick={() => setWs(null)}>Batal</button><button type="button" className="d-btn d-btn--primary" disabled={a.busy || !ws?.profile_id} onClick={() => a.run(async () => { await api.insert("work_shifts", { ...ws, tenant_id: tenantId }); setWs(null); r.reload(); })}>Simpan jadwal</button></>}>
        {ws && (
          <div className="d-form">
            <Field label="Karyawan" id="ws-p"><select id="ws-p" value={ws.profile_id} onChange={(e) => setWs({ ...ws, profile_id: e.target.value, branch_id: ppl[e.target.value]?.branch_id ?? ws.branch_id })}><option value="">Pilih…</option>{r.data.people.filter((p) => p.role !== "owner").map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></Field>
            <div className="d-form__row d-form__row--3">
              <Field label="Tanggal" id="ws-d"><input id="ws-d" type="date" value={ws.work_date} onChange={(e) => setWs({ ...ws, work_date: e.target.value })} /></Field>
              <Field label="Mulai" id="ws-s"><input id="ws-s" type="time" value={ws.start_time} onChange={(e) => setWs({ ...ws, start_time: e.target.value })} /></Field>
              <Field label="Selesai" id="ws-e"><input id="ws-e" type="time" value={ws.end_time} onChange={(e) => setWs({ ...ws, end_time: e.target.value })} /></Field>
            </div>
            <Field label="Cabang" id="ws-b"><select id="ws-b" value={ws.branch_id} onChange={(e) => setWs({ ...ws, branch_id: e.target.value })}>{r.data.branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
            <Feedback a={a} />
          </div>
        )}
      </Modal>
      {assign && <AssignBranches person={assign.person} initial={assign.ids} options={mine.options} onClose={() => setAssign(null)} onSaved={r.reload} />}
    </>
  );
}

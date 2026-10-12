import { useState } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { can } from "../../../lib/rbac.js";
import { PageHead, Panel, Loading, ErrorNote, Modal, Field, useAsync } from "../../ui/index.jsx";
import { useBranch, BranchSelect, useAction, Feedback, useLive } from "../../ops.jsx";

const ST = { available: "Kosong", occupied: "Terisi", cooking: "Diproses dapur", reserved: "Reservasi", dirty: "Perlu dibersihkan" };

export default function Floor() {
  const { api, role } = useAuth();
  const b = useBranch();
  const r = useAsync(() => (b.branchId ? api.list("tables", { eq: { branch_id: b.branchId }, order: ["sort"] }) : Promise.resolve([])), [api, b.branchId]);
  useLive(["tables"], r.reload);
  const [edit, setEdit] = useState(null);
  const a = useAction();
  const save = () => a.run(async () => {
    const { id, ...row } = edit;
    if (id) await api.update("tables", id, { label: row.label, area: row.area, seats: Number(row.seats), status: row.status });
    else await api.insert("tables", { ...row, seats: Number(row.seats), tenant_id: b.branch.tenant_id, branch_id: b.branchId, sort: (r.data?.length ?? 0) + 1 });
    setEdit(null);
    r.reload();
  });
  const areas = [...new Set((r.data ?? []).map((t) => t.area))];
  return (
    <>
      <PageHead eyebrow="Fitur 7 · Denah meja, kiosk & QR e-menu" title="Denah meja" desc="Susun area (lantai, outdoor, VIP) dan meja. Status warna diperbarui real-time dari kasir dan dapur."
        actions={<>{can(role, 7, "c") && <button type="button" className="d-btn d-btn--primary" onClick={() => setEdit({ label: "", area: areas[0] ?? "Lantai 1", seats: 4, status: "available" })}>Tambah meja</button>}<BranchSelect b={b} /></>} />
      {r.loading ? <Loading /> : r.error ? <ErrorNote error={r.error} onRetry={r.reload} /> : areas.map((area) => (
        <Panel key={area} title={area}>
          <ul className="pos-floor pos-floor--wide">{r.data.filter((t) => t.area === area).map((t) => (
            <li key={t.id}><button type="button" className={`pos-table st--${t.status}`} onClick={() => can(role, 7, "u") && setEdit({ ...t })}>
              <span className="pos-table__no">{t.label}</span><span className="pos-table__st">{ST[t.status]} · {t.seats} kursi</span></button></li>
          ))}</ul>
        </Panel>
      ))}
      <Modal open={Boolean(edit)} title={edit?.id ? `Meja ${edit.label}` : "Tambah meja"} onClose={() => setEdit(null)}
        footer={<>{edit?.id && can(role, 7, "d") && <button type="button" className="d-btn d-btn--danger-ghost" onClick={() => a.run(async () => { await api.remove("tables", edit.id); setEdit(null); r.reload(); })}>Hapus meja</button>}
          <button type="button" className="d-btn d-btn--ghost" onClick={() => setEdit(null)}>Batal</button><button type="button" className="d-btn d-btn--primary" disabled={a.busy || !edit?.label} onClick={save}>Simpan</button></>}>
        {edit && (
          <div className="d-form">
            <div className="d-form__row d-form__row--3">
              <Field label="Nomor" id="fl-l"><input id="fl-l" value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} /></Field>
              <Field label="Area" id="fl-a"><input id="fl-a" list="fl-areas" value={edit.area} onChange={(e) => setEdit({ ...edit, area: e.target.value })} /><datalist id="fl-areas">{["Lantai 1", "Lantai 2", "Outdoor", "Area merokok", "VIP", ...areas].map((x) => <option key={x} value={x} />)}</datalist></Field>
              <Field label="Kursi" id="fl-s"><input id="fl-s" type="number" min="1" value={edit.seats} onChange={(e) => setEdit({ ...edit, seats: e.target.value })} /></Field>
            </div>
            {edit.id && <Field label="Status" id="fl-st"><select id="fl-st" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>}
            <Feedback a={a} />
          </div>
        )}
      </Modal>
    </>
  );
}

import { useState } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { can } from "../../../lib/rbac.js";
import { rupiah, date } from "../../../lib/format.js";
import { PageHead, Panel, Loading, ErrorNote, Badge, Modal, Field, useAsync, Empty } from "../../ui/index.jsx";

const MODULES = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"];
const MODULE_NAME = { M1: "Kasir POS", M2: "Dapur", M3: "Inventori", M4: "Akuntansi", M5: "SDM", M6: "CRM", M7: "Omnichannel", M8: "Reservasi", M9: "Klinik", M10: "Ritel", M11: "Manufaktur", M12: "Capital" };
const EMPTY = { code: "", name: "", price_month: "", max_branches: 1, modules: ["M1"], is_active: true };

export default function Plans() {
  const { api, role } = useAuth();
  const plans = useAsync(() => api.listPlans(), [api]);
  const invoices = useAsync(() => api.listInvoices(), [api]);
  const tenants = useAsync(() => api.listTenants(), [api]);
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState(null);

  const save = async () => {
    if (!edit.code.trim() || !edit.name.trim()) return setErr("Kode dan nama wajib diisi.");
    try {
      await api.savePlan({ ...edit, price_month: edit.price_month === "" ? null : Number(edit.price_month), max_branches: Number(edit.max_branches) });
      setEdit(null);
      plans.reload();
    } catch (e) {
      setErr(e.message);
    }
  };
  const name = (id) => tenants.data?.find((t) => t.id === id)?.name ?? "—";

  return (
    <>
      <PageHead
        eyebrow="Superadmin · Fitur 1"
        title="Paket & tagihan"
        desc="Paket langganan dan modul yang dibuka. Harga kosong berarti belum ditetapkan."
        actions={can(role, 1, "c") && <button type="button" className="d-btn d-btn--primary" onClick={() => { setErr(null); setEdit({ ...EMPTY }); }}>Tambah paket</button>}
      />
      {plans.loading ? <Loading /> : plans.error ? <ErrorNote error={plans.error} onRetry={plans.reload} /> : (
        <div className="d-plan-grid">
          {plans.data.map((p) => (
            <article key={p.id} className="d-plan">
              <header>
                <p className="d-mono d-muted">{p.code}</p>
                <h2>{p.name}</h2>
                <p className="d-plan__price">{p.price_month == null ? "Harga belum ditetapkan" : `${rupiah(p.price_month)} / bulan`}</p>
              </header>
              <p className="d-list__meta">Maks. {p.max_branches} cabang · {p.is_active ? "aktif" : "nonaktif"}</p>
              <ul className="d-chips">{p.modules.map((m) => <li key={m}><Badge>{m} {MODULE_NAME[m]}</Badge></li>)}</ul>
              {can(role, 1, "u") && (
                <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={() => { setErr(null); setEdit({ ...p, price_month: p.price_month ?? "" }); }}>Ubah paket</button>
              )}
            </article>
          ))}
        </div>
      )}

      <Panel title="Tagihan">
        {invoices.loading ? <Loading /> : (invoices.data ?? []).length === 0 ? <Empty title="Belum ada tagihan" /> : (
          <div className="d-table-wrap">
            <table className="d-table">
              <thead><tr><th scope="col">Tenant</th><th scope="col">Periode</th><th scope="col" className="d-num">Jumlah</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {invoices.data.map((i) => (
                  <tr key={i.id}>
                    <td>{name(i.tenant_id)}</td>
                    <td>{date(i.period)}</td>
                    <td className="d-num">{rupiah(i.amount)}</td>
                    <td><Badge tone={i.status === "paid" ? "ok" : i.status === "unpaid" ? "warn" : "neutral"}>{i.status === "paid" ? "Lunas" : i.status === "unpaid" ? "Belum dibayar" : "Batal"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        open={Boolean(edit)}
        title={edit?.id ? "Ubah paket" : "Tambah paket"}
        onClose={() => setEdit(null)}
        footer={<>
          <button type="button" className="d-btn d-btn--ghost" onClick={() => setEdit(null)}>Batal</button>
          <button type="button" className="d-btn d-btn--primary" onClick={save}>Simpan paket</button>
        </>}
      >
        {edit && (
          <div className="d-form">
            <div className="d-form__row">
              <Field label="Kode" id="p-code"><input id="p-code" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></Field>
              <Field label="Nama" id="p-name"><input id="p-name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            </div>
            <div className="d-form__row">
              <Field label="Harga per bulan (Rp)" id="p-price" hint="Kosongkan jika belum ditetapkan">
                <input id="p-price" inputMode="numeric" value={edit.price_month} onChange={(e) => setEdit({ ...edit, price_month: e.target.value.replace(/\D/g, "") })} />
              </Field>
              <Field label="Maks. cabang" id="p-br">
                <input id="p-br" type="number" min="1" value={edit.max_branches} onChange={(e) => setEdit({ ...edit, max_branches: e.target.value })} />
              </Field>
            </div>
            <fieldset className="d-fieldset">
              <legend>Modul yang dibuka</legend>
              <div className="d-checks">
                {MODULES.map((m) => (
                  <label key={m} className="d-check">
                    <input type="checkbox" checked={edit.modules.includes(m)}
                      onChange={(e) => setEdit({ ...edit, modules: e.target.checked ? [...edit.modules, m] : edit.modules.filter((x) => x !== m) })} />
                    <span>{m} · {MODULE_NAME[m]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="d-check">
              <input type="checkbox" checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} />
              <span>Paket aktif (tampil untuk pendaftaran)</span>
            </label>
            {err && <p className="d-field__error" role="alert">{err}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}

import { useMemo, useState } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { permOf } from "../../../lib/rbac.js";
import { rupiah, rupiahShort, number, pct, iso, addDays } from "../../../lib/format.js";
import { PageHead, Panel, Stat, Loading, ErrorNote, LineChart, BarList, useAsync, Empty } from "../../ui/index.jsx";

const RANGES = [7, 30, 60];

function sum(rows) {
  const s = rows.reduce(
    (a, r) => ({
      orders: a.orders + Number(r.orders), revenue: a.revenue + Number(r.revenue), discount: a.discount + Number(r.discount),
      cogs: a.cogs + Number(r.cogs), opex: a.opex + Number(r.opex),
    }),
    { orders: 0, revenue: 0, discount: 0, cogs: 0, opex: 0 }
  );
  s.gross = s.revenue - s.cogs;
  s.net = s.gross - s.opex;
  return s;
}

const delta = (now, prev) => (prev ? (now - prev) / prev : null);
const deltaText = (d) => (d == null ? "Tanpa pembanding" : `${d >= 0 ? "▲" : "▼"} ${pct(Math.abs(d))} vs periode sebelumnya`);

export default function Dashboard() {
  const { api, role, tenantId } = useAuth();
  const operasional = permOf(role, 2)?.scope === "operasional"; // GM: "R (Operasional)"
  const [range, setRange] = useState(30);
  const [branch, setBranch] = useState("");
  const branches = useAsync(() => api.listBranches(tenantId), [api, tenantId]);

  const to = iso(new Date());
  const from = iso(addDays(new Date(), -(range - 1)));
  const prevFrom = iso(addDays(new Date(), -(2 * range - 1)));
  const prevTo = iso(addDays(new Date(), -range));

  const cur = useAsync(() => api.dashboardDaily({ from, to, tenantId, branchId: branch || null }), [api, tenantId, from, branch]);
  const prev = useAsync(() => api.dashboardDaily({ from: prevFrom, to: prevTo, tenantId, branchId: branch || null }), [api, tenantId, prevFrom, branch]);

  const view = useMemo(() => {
    if (!cur.data) return null;
    const total = sum(cur.data);
    const byDay = new Map();
    const byBranch = new Map();
    for (const r of cur.data) {
      byDay.set(r.day, (byDay.get(r.day) ?? 0) + Number(r.revenue));
      const b = byBranch.get(r.branch_name) ?? [];
      b.push(r);
      byBranch.set(r.branch_name, b);
    }
    return {
      total,
      prev: prev.data ? sum(prev.data) : null,
      line: [...byDay].map(([d, y]) => ({ x: new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" }), y })),
      branches: [...byBranch].map(([name, rows]) => ({ name, ...sum(rows) })),
    };
  }, [cur.data, prev.data]);

  return (
    <>
      <PageHead
        eyebrow={operasional ? "Fitur 2 · R (Operasional)" : "Fitur 2 · Dashboard eksekutif"}
        title="Dashboard"
        desc={operasional ? "Tampilan operasional: beban dan laba bersih tidak termasuk hak akses GM." : "Omset, HPP berbasis resep, dan laba riil per cabang."}
        actions={
          <div className="d-filters">
            <div className="d-seg" role="radiogroup" aria-label="Rentang waktu">
              {RANGES.map((r) => (
                <button key={r} type="button" role="radio" aria-checked={range === r} onClick={() => setRange(r)}>{r} hari</button>
              ))}
            </div>
            <label className="d-switch">
              <span className="d-switch__label">Cabang</span>
              <select value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value="">Semua cabang</option>
                {(branches.data ?? []).filter((b) => !b.is_warehouse).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          </div>
        }
      />

      {cur.loading ? <Loading /> : cur.error ? <ErrorNote error={cur.error} onRetry={cur.reload} /> : !view || view.total.orders === 0 ? (
        <Empty title="Belum ada transaksi pada periode ini">Data muncul setelah kasir mencatat penjualan.</Empty>
      ) : (
        <>
          <div className="d-stats">
            <Stat label="Omset kotor" value={rupiah(view.total.revenue)} sub={deltaText(view.prev && delta(view.total.revenue, view.prev.revenue))} />
            <Stat label="Transaksi" value={number(view.total.orders)} sub={`Rata-rata ${rupiah(view.total.revenue / view.total.orders)}`} />
            <Stat label="Laba kotor" value={rupiah(view.total.gross)} sub={`Marjin ${pct(view.total.gross / view.total.revenue)} · HPP ${rupiahShort(view.total.cogs)}`} />
            <Stat label="Laba bersih" hidden={operasional} value={rupiah(view.total.net)} sub={`Beban operasional ${rupiahShort(view.total.opex)}`} />
          </div>
          <div className="d-grid d-grid--wide">
            <Panel title="Omset harian" meta={`${range} hari terakhir`}>
              <LineChart points={view.line} format={(v, axis) => (axis ? rupiahShort(v) : rupiah(v))} label={`Omset harian ${range} hari terakhir`} />
            </Panel>
            <Panel title="Omset per cabang">
              <BarList rows={view.branches.map((b) => ({ label: b.name, value: b.revenue }))} format={rupiahShort} />
            </Panel>
          </div>
          <Panel title="Rincian cabang">
            <div className="d-table-wrap">
              <table className="d-table">
                <thead>
                  <tr>
                    <th scope="col">Cabang</th><th scope="col" className="d-num">Transaksi</th><th scope="col" className="d-num">Omset</th>
                    <th scope="col" className="d-num">Diskon</th><th scope="col" className="d-num">HPP</th><th scope="col" className="d-num">Marjin kotor</th>
                    {!operasional && <th scope="col" className="d-num">Laba bersih</th>}
                  </tr>
                </thead>
                <tbody>
                  {view.branches.map((b) => (
                    <tr key={b.name}>
                      <td>{b.name}</td>
                      <td className="d-num">{number(b.orders)}</td>
                      <td className="d-num">{rupiah(b.revenue)}</td>
                      <td className="d-num">{rupiah(b.discount)}</td>
                      <td className="d-num">{rupiah(b.cogs)}</td>
                      <td className="d-num">{pct(b.gross / b.revenue)}</td>
                      {!operasional && <td className="d-num">{rupiah(b.net)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}

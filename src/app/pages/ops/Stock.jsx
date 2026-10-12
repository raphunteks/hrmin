import { useState } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { can, permOf } from "../../../lib/rbac.js";
import { rupiah, dateTime } from "../../../lib/format.js";
import { PageHead, Panel, Loading, ErrorNote, useAsync, Badge, Empty, Stat } from "../../ui/index.jsx";
import { useBranch, BranchSelect, useAction, Feedback, useIndex, qtyFmt, useLive } from "../../ops.jsx";

const KIND = { sale: "Penjualan", waste: "Waste", opname: "Opname", transfer_in: "Transfer masuk", transfer_out: "Transfer keluar", purchase: "Pembelian", production: "Produksi", void_restock: "Void (restock)" };

export default function Stock() {
  const { api, role, tenantId } = useAuth();
  const b = useBranch({ warehouses: true });
  const [tab, setTab] = useState("level");
  const a = useAction();
  const r = useAsync(async () => {
    if (!b.branchId) return null;
    const [items, levels, moves, counts, waste] = await Promise.all([
      api.list("inventory_items", { eq: { tenant_id: tenantId }, order: ["name"] }),
      api.list("stock_levels", { eq: { branch_id: b.branchId } }),
      api.list("stock_movements", { eq: { branch_id: b.branchId }, order: ["created_at", "desc"], limit: 60 }),
      api.list("stock_counts", { eq: { branch_id: b.branchId, status: "submitted" }, order: ["created_at", "desc"] }),
      api.list("waste_logs", { eq: { branch_id: b.branchId }, order: ["created_at", "desc"], limit: 40 }),
    ]);
    return { items, levels, moves, counts, waste };
  }, [api, b.branchId, tenantId]);
  useLive(["stock_levels", "stock_counts"], r.reload);
  const items = useIndex(r.data?.items);
  const lvl = (id) => r.data?.levels.find((l) => l.item_id === id)?.qty ?? 0;
  const low = (r.data?.items ?? []).filter((i) => lvl(i.id) < i.min_qty);
  const value = (r.data?.items ?? []).reduce((s, i) => s + lvl(i.id) * i.cost_per_unit, 0);
  const canApply = can(role, 10, "u") && !permOf(role, 10)?.scope;

  return (
    <>
      <PageHead eyebrow={`Fitur 10 · ${permOf(role, 10)?.label}`} title="Stok & gudang"
        actions={<><div className="d-seg" role="radiogroup" aria-label="Tampilan">{[["level", "Level"], ["mutasi", "Mutasi"], ["opname", `Opname${r.data?.counts.length ? ` · ${r.data.counts.length}` : ""}`], ["waste", "Waste"]].map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div><BranchSelect b={b} label="Lokasi" /></>} />
      {r.loading && !r.data ? <Loading /> : r.error ? <ErrorNote error={r.error} onRetry={r.reload} /> : !r.data ? null : (
        <>
          <div className="d-stats">
            <Stat label="Nilai persediaan" value={rupiah(value)} sub={b.branch?.name} />
            <Stat label="Di bawah minimum" value={low.length} sub={low.slice(0, 2).map((i) => i.name).join(", ") || "Aman"} />
            <Stat label="Opname menunggu" value={r.data.counts.length} />
            <Stat label="Waste (40 terakhir)" value={rupiah(r.data.waste.reduce((s, w) => s + Number(w.cost), 0))} />
          </div>
          <Panel>
            {tab === "level" && (
              <div className="d-table-wrap"><table className="d-table">
                <thead><tr><th scope="col">Bahan</th><th scope="col" className="d-num">Stok</th><th scope="col" className="d-num">Minimum</th><th scope="col" className="d-num">Nilai</th><th scope="col">Status</th></tr></thead>
                <tbody>{r.data.items.map((i) => (
                  <tr key={i.id}><td>{i.name} <span className="d-mono d-muted">{i.code}</span></td><td className="d-num">{qtyFmt(lvl(i.id), i.unit)}</td><td className="d-num">{qtyFmt(i.min_qty, i.unit)}</td>
                    <td className="d-num">{rupiah(lvl(i.id) * i.cost_per_unit)}</td>
                    <td>{lvl(i.id) < 0 ? <Badge tone="danger">Minus</Badge> : lvl(i.id) < i.min_qty ? <Badge tone="warn">Pesan ulang</Badge> : <Badge tone="ok">Aman</Badge>}</td></tr>
                ))}</tbody>
              </table></div>
            )}
            {tab === "mutasi" && (r.data.moves.length === 0 ? <Empty title="Belum ada mutasi" /> : (
              <div className="d-table-wrap"><table className="d-table">
                <thead><tr><th scope="col">Waktu</th><th scope="col">Jenis</th><th scope="col">Bahan</th><th scope="col" className="d-num">Perubahan</th><th scope="col">Referensi</th></tr></thead>
                <tbody>{r.data.moves.map((m) => (
                  <tr key={m.id}><td className="d-nowrap">{dateTime(m.created_at)}</td><td>{KIND[m.kind]}</td><td>{items[m.item_id]?.name}</td>
                    <td className="d-num">{m.qty_delta > 0 ? "+" : ""}{qtyFmt(m.qty_delta, items[m.item_id]?.unit)}</td><td className="d-mono d-muted">{m.ref}</td></tr>
                ))}</tbody>
              </table></div>
            ))}
            {tab === "opname" && (r.data.counts.length === 0 ? <Empty title="Tidak ada opname menunggu" /> : (
              <>
                <div className="d-table-wrap"><table className="d-table">
                  <thead><tr><th scope="col">Bahan</th><th scope="col" className="d-num">Sistem saat hitung</th><th scope="col" className="d-num">Fisik</th><th scope="col" className="d-num">Selisih</th><th scope="col" className="d-num">Nilai</th></tr></thead>
                  <tbody>{r.data.counts.map((c) => {
                    const diff = c.counted_qty - c.system_qty, it = items[c.item_id];
                    return <tr key={c.id}><td>{it?.name}</td><td className="d-num">{qtyFmt(c.system_qty, it?.unit)}</td><td className="d-num">{qtyFmt(c.counted_qty, it?.unit)}</td>
                      <td className="d-num"><Badge tone={diff < 0 ? "danger" : diff > 0 ? "accent" : "ok"}>{diff > 0 ? "+" : ""}{qtyFmt(diff, it?.unit)}</Badge></td><td className="d-num">{rupiah(diff * (it?.cost_per_unit ?? 0))}</td></tr>;
                  })}</tbody>
                </table></div>
                {canApply && (
                  <div className="d-form__actions">
                    <button type="button" className="d-btn d-btn--ghost" disabled={a.busy} onClick={() => a.run(async () => { await api.rpc("apply_opname", { p_ids: r.data.counts.map((c) => c.id), p_apply: false }); r.reload(); }, "Opname ditolak")}>Tolak semua</button>
                    <button type="button" className="d-btn d-btn--primary" disabled={a.busy} onClick={() => a.run(async () => { const v = await api.rpc("apply_opname", { p_ids: r.data.counts.map((c) => c.id) }); r.reload(); return v; }, (v) => `Stok disesuaikan, selisih ${rupiah(v)} dijurnal`)}>Terapkan penyesuaian</button>
                  </div>
                )}
              </>
            ))}
            {tab === "waste" && (r.data.waste.length === 0 ? <Empty title="Belum ada waste" /> : (
              <ul className="d-list">{r.data.waste.map((w) => <li key={w.id}><div><p className="d-list__title">{items[w.item_id]?.name} · {qtyFmt(w.qty, items[w.item_id]?.unit)}</p><p className="d-list__meta">{w.reason} · {dateTime(w.created_at)}</p></div><span className="d-mono">{rupiah(w.cost)}</span></li>)}</ul>
            ))}
            <Feedback a={a} />
          </Panel>
        </>
      )}
    </>
  );
}

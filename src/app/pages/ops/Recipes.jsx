import { useMemo, useState } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { can, permOf } from "../../../lib/rbac.js";
import { rupiah, pct } from "../../../lib/format.js";
import { PageHead, Panel, Loading, ErrorNote, Field, useAsync, Empty, Badge } from "../../ui/index.jsx";
import { useAction, Feedback, useIndex, useBranch, BranchSelect, qtyFmt } from "../../ops.jsx";

export default function Recipes() {
  const { api, role, tenantId } = useAuth();
  const b = useBranch({ warehouses: true });
  const r = useAsync(async () => {
    const [products, items, lines] = await Promise.all([
      api.list("products", { eq: { tenant_id: tenantId }, order: ["name"] }),
      api.list("inventory_items", { eq: { tenant_id: tenantId }, order: ["name"] }),
      api.list("bom_lines", { eq: { tenant_id: tenantId } }),
    ]);
    return { products, items, lines };
  }, [api, tenantId]);
  const [sel, setSel] = useState(null); // { kind: "product"|"item", id }
  const [add, setAdd] = useState({ component: "", qty: "" });
  const [batches, setBatches] = useState("1");
  const a = useAction();
  const items = useIndex(r.data?.items);
  const d = r.data;
  const cur = sel ?? (d?.products[0] ? { kind: "product", id: d.products[0].id } : null);
  const lines = useMemo(() => (d && cur ? d.lines.filter((l) => (cur.kind === "product" ? l.product_id === cur.id : l.parent_item_id === cur.id)) : []), [d, cur]);
  const cost = lines.reduce((s, l) => s + l.qty * (items[l.component_id]?.cost_per_unit ?? 0), 0);
  const product = cur?.kind === "product" ? d?.products.find((p) => p.id === cur.id) : null;
  const semi = cur?.kind === "item" ? items[cur.id] : null;
  const editable = can(role, 4, "u");

  const addLine = () => a.run(async () => {
    await api.insert("bom_lines", { tenant_id: tenantId, product_id: cur.kind === "product" ? cur.id : null, parent_item_id: cur.kind === "item" ? cur.id : null, component_id: add.component, qty: Number(add.qty), yield_qty: lines[0]?.yield_qty ?? 1 });
    setAdd({ component: "", qty: "" });
    r.reload();
  });

  return (
    <>
      <PageHead eyebrow={`Fitur 4 · ${permOf(role, 4)?.label}`} title="Resep & BOM" desc="Setiap porsi terjual memotong bahan sesuai takaran di sini. Bahan setengah jadi (kaldu) diproduksi per batch lalu dipotong per porsi." />
      {r.loading ? <Loading /> : r.error ? <ErrorNote error={r.error} onRetry={r.reload} /> : (
        <div className="bom">
          <nav className="bom-list" aria-label="Daftar resep">
            <p className="d-nav__label">Menu</p>
            <ul>{d.products.map((p) => <li key={p.id}><button type="button" className={cur?.id === p.id ? "is-active" : undefined} onClick={() => setSel({ kind: "product", id: p.id })}>{p.name}</button></li>)}</ul>
            <p className="d-nav__label">Barang setengah jadi</p>
            <ul>{d.items.filter((i) => i.is_semi).map((i) => <li key={i.id}><button type="button" className={cur?.id === i.id ? "is-active" : undefined} onClick={() => setSel({ kind: "item", id: i.id })}>{i.name}</button></li>)}</ul>
          </nav>
          <Panel title={product?.name ?? semi?.name ?? "Pilih resep"} meta={product ? `Harga jual ${rupiah(product.price)}` : semi ? `Hasil per batch ${qtyFmt(lines[0]?.yield_qty ?? 0, semi.unit)}` : ""}>
            {lines.length === 0 ? <Empty title="Resep belum diisi">Tambahkan komponen bahan di bawah.</Empty> : (
              <div className="d-table-wrap"><table className="d-table">
                <thead><tr><th scope="col">Bahan</th><th scope="col" className="d-num">Takaran</th><th scope="col" className="d-num">Biaya</th><th scope="col"><span className="sr-only">Aksi</span></th></tr></thead>
                <tbody>{lines.map((l) => (
                  <tr key={l.id}><td>{items[l.component_id]?.name}{items[l.component_id]?.is_semi && <Badge tone="accent">sub-resep</Badge>}</td>
                    <td className="d-num">{qtyFmt(l.qty, items[l.component_id]?.unit)}</td>
                    <td className="d-num">{rupiah(l.qty * (items[l.component_id]?.cost_per_unit ?? 0))}</td>
                    <td className="d-row-actions">{can(role, 4, "d") && <button type="button" className="d-btn d-btn--danger-ghost d-btn--sm" onClick={() => a.run(async () => { await api.remove("bom_lines", l.id); r.reload(); })}>Hapus</button>}</td></tr>
                ))}</tbody>
              </table></div>
            )}
            <ul className="d-list">
              <li><span>{product ? "HPP per porsi" : "Biaya per batch"}</span><strong className="d-mono">{rupiah(cost)}</strong></li>
              {product && <li><span>Marjin kotor</span><strong className="d-mono">{pct((product.price - cost) / product.price)}</strong></li>}
              {semi && <li><span>Biaya per {semi.unit}</span><strong className="d-mono">{rupiah(cost / (lines[0]?.yield_qty || 1))}</strong></li>}
            </ul>
            {editable && cur && (
              <div className="d-form__row d-form__row--3">
                <Field label="Bahan" id="bom-c"><select id="bom-c" value={add.component} onChange={(e) => setAdd({ ...add, component: e.target.value })}><option value="">Pilih…</option>{d.items.filter((i) => i.id !== cur.id).map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select></Field>
                <Field label="Takaran" id="bom-q"><input id="bom-q" inputMode="decimal" value={add.qty} onChange={(e) => setAdd({ ...add, qty: e.target.value.replace(/[^\d.]/g, "") })} /></Field>
                <button type="button" className="d-btn d-btn--ghost d-self-end" disabled={!add.component || !add.qty || a.busy} onClick={addLine}>Tambah bahan</button>
              </div>
            )}
            {semi && can(role, 10, "u") && !permOf(role, 10)?.scope && (
              <div className="d-form__row d-form__row--3">
                <BranchSelect b={b} label="Produksi di" />
                <Field label="Jumlah batch" id="bom-b"><input id="bom-b" inputMode="decimal" value={batches} onChange={(e) => setBatches(e.target.value.replace(/[^\d.]/g, ""))} /></Field>
                <button type="button" className="d-btn d-btn--primary d-self-end" disabled={!batches || a.busy}
                  onClick={() => a.run(async () => { const y = await api.rpc("produce_semi", { p_branch: b.branchId, p_item: semi.id, p_batches: Number(batches) }); r.reload(); return y; }, (y) => `${qtyFmt(y, semi.unit)} ${semi.name} masuk stok`)}>Produksi</button>
              </div>
            )}
            <Feedback a={a} />
          </Panel>
        </div>
      )}
    </>
  );
}

import { useMemo, useState } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { rupiah, date, dateTime } from "../../../lib/format.js";
import { healthOf, inviteStatus, INVITE_STATUS, auditText } from "../../../lib/watch.js";
import { PageHead, Panel, Stat, Loading, ErrorNote, Badge, Modal, Field, Empty, useAsync } from "../../ui/index.jsx";
import { useAction, Feedback, useLive } from "../../ops.jsx";
import { STATUS_TONE, STATUS_LABEL } from "../superadmin/Overview.jsx";
import { ServiceTabs, HealthPill, ago } from "./shared.jsx";

const PILLARS = { fnb: "Food & Beverages", retail: "Retail & Distribusi", service: "Hospitality & Personal Care", health: "Healthcare", mfg: "Manufaktur", omni: "Omnichannel" };
const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const NEW = { name: "", slug: "", pillar: "fnb", plan: "", trial: 14, branches: "Cabang Utama", ownerName: "", ownerEmail: "", ownerPhone: "" };

/** Superadmin · Kelola Owner Merchant — hanya akun berperan Owner (tidak ada dropdown peran, tidak ada jalur naik ke Superadmin). */
export default function Owners() {
  const { api } = useAuth();
  const r = useAsync(async () => {
    const [health, invites, plans, tenants] = await Promise.all([
      api.rpc("tenant_health"),
      api.list("staff_invites", { order: ["created_at", "desc"] }),
      api.listPlans(),
      api.listTenants(),
    ]);
    return { health, invites, plans, tenants };
  }, [api]);
  useLive(["tenants", "staff_invites", "profiles"], r.reload);
  const a = useAction();
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fPillar, setFPillar] = useState("");
  const [form, setForm] = useState(null);
  const [susp, setSusp] = useState(null); // { row, reason }
  const [detail, setDetail] = useState(null);

  const rows = useMemo(() => (r.data?.health ?? []).map((t) => {
    const ownerInvites = (r.data.invites ?? []).filter((i) => i.tenant_id === t.tenant_id && i.role === "owner");
    const open = ownerInvites.find((i) => !i.accepted_at && !i.revoked_at);
    return { t, h: healthOf(t), invite: open ?? null, shownInvite: open ?? ownerInvites[0] ?? null };
  }), [r.data]);
  const shown = rows.filter(({ t, shownInvite }) =>
    (!fStatus || t.status === fStatus) && (!fPillar || t.pillar === fPillar)
    && (!q || `${t.name} ${t.owner_name ?? shownInvite?.full_name ?? ""} ${t.owner_email ?? shownInvite?.email ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  const count = (f) => rows.filter(({ t }) => f(t)).length;
  const pendingInvites = rows.filter((x) => x.invite).length;

  /** Simpan tenant + undangan Owner dalam satu transaksi database, lalu kirim undangan. */
  const create = () => a.run(async () => {
    const f = form;
    const res = await api.rpc("create_tenant_with_owner", {
      p_name: f.name, p_slug: f.slug || slugify(f.name), p_pillar: f.pillar, p_plan: f.plan || null,
      p_owner_name: f.ownerName, p_owner_email: f.ownerEmail, p_owner_phone: f.ownerPhone || null,
      p_trial_days: Number(f.trial), p_branches: f.branches.split(",").map((x) => x.trim()).filter(Boolean),
    });
    setForm(null);
    r.reload();
    try {
      await api.sendInvite(res.invite_id);
      return `Tenant dibuat dan undangan dikirim ke ${f.ownerEmail}.`;
    } catch (e) {
      return `Tenant dibuat, tetapi undangan belum terkirim (${e.message}). Gunakan “Kirim ulang” pada barisnya.`;
    }
  }, (m) => m);

  const resend = (inv) => a.run(async () => {
    await api.rpc("resend_invite", { p_id: inv.id });
    await api.sendInvite(inv.id);
    r.reload();
  }, "Undangan dikirim ulang (berlaku 48 jam).");
  const revoke = (inv) => a.run(async () => { await api.rpc("revoke_invite", { p_id: inv.id }); r.reload(); }, "Undangan dicabut.");
  const extend = (t) => a.run(async () => { await api.rpc("extend_trial", { p_tenant: t.tenant_id, p_days: 7 }); r.reload(); }, `Masa berlaku ${t.name} diperpanjang 7 hari.`);
  const suspend = () => a.run(async () => {
    await api.rpc("set_tenant_suspended", { p_tenant: susp.row.t.tenant_id, p_suspend: true, p_reason: susp.reason });
    setSusp(null);
    r.reload();
  }, "Status tenant diperbarui.");

  return (
    <>
      <PageHead eyebrow="Superadmin · Layanan & Akses" title="Kelola Owner Merchant"
        desc="Satu baris per merchant. Undang Owner baru sekaligus membuat tenant-nya; tangguhkan tenant mencabut akses seluruh tim tanpa menghapus data."
        actions={<button type="button" className="d-btn d-btn--primary" onClick={() => { a.setError(null); a.setOk(null); setForm({ ...NEW, plan: r.data?.plans?.find((p) => p.is_active)?.id ?? "" }); }}>Undang Owner baru</button>} />
      <ServiceTabs />
      {r.loading && !r.data ? <Loading /> : r.error ? <ErrorNote error={r.error} onRetry={r.reload} /> : (
        <>
          <div className="d-stats">
            <Stat label="Merchant" value={rows.length} sub={`${count((t) => t.status === "active")} aktif`} />
            <Stat label="Masa uji coba" value={count((t) => t.status === "trial")} sub="trial berjalan" />
            <Stat label="Telat / ditangguhkan" value={count((t) => ["past_due", "suspended"].includes(t.status))} sub="perlu perhatian" />
            <Stat label="Undangan menunggu" value={pendingInvites} sub="Owner belum menerima" />
          </div>
          <Feedback a={a} />
          <Panel title="Owner & tenant" meta={`${shown.length} dari ${rows.length}`} actions={
            <div className="d-filters">
              <input className="d-date" type="search" placeholder="Cari usaha, nama, email" aria-label="Cari" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className="d-date" aria-label="Status" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                <option value="">Semua status</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select className="d-date" aria-label="Pilar" value={fPillar} onChange={(e) => setFPillar(e.target.value)}>
                <option value="">Semua pilar</option>
                {Object.entries(PILLARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>}>
            {shown.length === 0 ? <Empty title="Tidak ada merchant yang cocok" /> : (
              <div className="d-table-wrap"><table className="d-table">
                <thead><tr>
                  <th scope="col">Owner</th><th scope="col">Usaha</th><th scope="col">Paket</th><th scope="col">Status</th>
                  <th scope="col" className="d-num">Cabang · Staf</th><th scope="col">Terakhir aktif</th><th scope="col">Kesehatan</th><th scope="col"><span className="sr-only">Aksi</span></th>
                </tr></thead>
                <tbody>{shown.map(({ t, h, invite, shownInvite }) => {
                  const st = shownInvite ? INVITE_STATUS[inviteStatus(shownInvite)] : null;
                  return (
                    <tr key={t.tenant_id}>
                      <td>{t.owner_name ?? shownInvite?.full_name ?? "—"}<p className="d-list__meta">{t.owner_email ?? shownInvite?.email ?? "—"}</p>
                        {!t.owner_id && st && <Badge tone={st[1]}>Undangan: {st[0]}</Badge>}
                        {t.owner_id && t.owner_active === false && <Badge tone="danger">Login dinonaktifkan</Badge>}</td>
                      <td>{t.name}<p className="d-list__meta">{PILLARS[t.pillar]}</p></td>
                      <td>{t.plan_name ?? "—"}<p className="d-list__meta">{t.period_end ? `s.d. ${date(t.period_end)}` : "—"}</p></td>
                      <td><Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge></td>
                      <td className="d-num">{t.branches} · {t.staff}</td>
                      <td>{t.owner_id ? ago(t.owner_last_login) : "—"}</td>
                      <td><HealthPill health={h} /></td>
                      <td><div className="d-row-actions">
                        <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={() => setDetail(t.tenant_id)}>Detail</button>
                        {invite && <button type="button" className="d-btn d-btn--ghost d-btn--sm" disabled={a.busy} onClick={() => resend(invite)}>Kirim ulang</button>}
                        {invite && <button type="button" className="d-btn d-btn--danger-ghost d-btn--sm" disabled={a.busy} onClick={() => revoke(invite)}>Cabut</button>}
                        {["trial", "past_due"].includes(t.status) && <button type="button" className="d-btn d-btn--ghost d-btn--sm" disabled={a.busy} onClick={() => extend(t)}>+7 hari</button>}
                        {t.status === "suspended"
                          ? <button type="button" className="d-btn d-btn--ghost d-btn--sm" disabled={a.busy} onClick={() => a.run(async () => { await api.rpc("set_tenant_suspended", { p_tenant: t.tenant_id, p_suspend: false }); r.reload(); }, `${t.name} diaktifkan kembali.`)}>Aktifkan</button>
                          : <button type="button" className="d-btn d-btn--danger-ghost d-btn--sm" onClick={() => setSusp({ row: { t }, reason: "" })}>Tangguhkan</button>}
                      </div></td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            )}
            <p className="d-text d-muted svc-foot">Belum tersedia di versi ini: reset 2FA (2FA belum ada), kirim pesan langsung, dan ekspor data tenant untuk permintaan PDP.</p>
          </Panel>
        </>
      )}

      <Modal open={Boolean(form)} title="Undang Owner baru" onClose={() => setForm(null)}
        footer={<><button type="button" className="d-btn d-btn--ghost" onClick={() => setForm(null)}>Batal</button>
          <button type="button" className="d-btn d-btn--primary" disabled={a.busy || !form?.name || !form?.ownerName || !form?.ownerEmail} onClick={create}>Buat tenant &amp; kirim undangan</button></>}>
        {form && (
          <div className="d-form">
            <Field label="Nama usaha" id="o-name"><input id="o-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} /></Field>
            <div className="d-form__row">
              <Field label="Slug" id="o-slug" hint="Huruf kecil, angka, tanda hubung."><input id="o-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
              <Field label="Jenis usaha" id="o-pillar"><select id="o-pillar" value={form.pillar} onChange={(e) => setForm({ ...form, pillar: e.target.value })}>{Object.entries(PILLARS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            </div>
            <div className="d-form__row">
              <Field label="Paket" id="o-plan"><select id="o-plan" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}><option value="">Belum dipilih</option>{(r.data?.plans ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <Field label="Masa uji coba (hari)" id="o-trial"><input id="o-trial" type="number" min="0" max="90" value={form.trial} onChange={(e) => setForm({ ...form, trial: e.target.value })} /></Field>
            </div>
            <Field label="Cabang awal" id="o-br" hint="Pisahkan dengan koma. Owner tidak dapat membuat cabang sendiri."><input id="o-br" value={form.branches} onChange={(e) => setForm({ ...form, branches: e.target.value })} /></Field>
            <div className="d-form__row">
              <Field label="Nama Owner" id="o-on"><input id="o-on" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} /></Field>
              <Field label="WhatsApp Owner (opsional)" id="o-op"><input id="o-op" inputMode="tel" value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} /></Field>
            </div>
            <Field label="Email Owner" id="o-oe" hint="Undangan berlaku 48 jam dan dikirim ke email ini."><input id="o-oe" type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} /></Field>
            <Feedback a={a} />
          </div>
        )}
      </Modal>

      <Modal open={Boolean(susp)} title={`Tangguhkan ${susp?.row.t.name ?? ""}`} onClose={() => setSusp(null)}
        footer={<><button type="button" className="d-btn d-btn--ghost" onClick={() => setSusp(null)}>Batal</button>
          <button type="button" className="d-btn d-btn--danger" disabled={a.busy || (susp?.reason ?? "").trim().length < 3} onClick={suspend}>Tangguhkan tenant</button></>}>
        {susp && (
          <div className="d-form">
            <p className="d-text">Seluruh tim tenant ini langsung tidak bisa membaca atau menulis data. Data tetap utuh dan dapat dipulihkan dengan “Aktifkan”.</p>
            <Field label="Alasan (ditampilkan di halaman masuk Owner)" id="s-reason"><input id="s-reason" value={susp.reason} onChange={(e) => setSusp({ ...susp, reason: e.target.value })} /></Field>
            <Feedback a={a} />
          </div>
        )}
      </Modal>

      {detail && <OwnerDetail tenantId={detail} onClose={() => setDetail(null)} plans={r.data?.plans ?? []} tenants={r.data?.tenants ?? []} health={rows.find((x) => x.t.tenant_id === detail)} reload={r.reload} />}
    </>
  );
}

function OwnerDetail({ tenantId, onClose, plans, tenants, health, reload }) {
  const { api } = useAuth();
  const a = useAction();
  const d = useAsync(async () => {
    const [inv, notes, tickets, audit] = await Promise.all([
      api.listInvoices(),
      api.list("tenant_notes", { eq: { tenant_id: tenantId }, order: ["created_at", "desc"] }),
      api.list("support_tickets", { eq: { tenant_id: tenantId }, order: ["created_at", "desc"] }),
      api.listAudit({ tenantId, limit: 12 }),
    ]);
    return { inv: inv.filter((i) => i.tenant_id === tenantId), notes, tickets, audit };
  }, [api, tenantId]);
  const t = health?.t;
  const tenantRow = tenants.find((x) => x.id === tenantId);
  const [plan, setPlan] = useState(tenantRow?.plan_id ?? "");
  const [note, setNote] = useState("");
  const [off, setOff] = useState(null);
  if (!t) return null;
  const savePlan = () => a.run(async () => { await api.saveTenant({ ...tenantRow, plan_id: plan || null }); reload(); d.reload(); }, "Paket diperbarui.");
  const addNote = () => a.run(async () => { await api.rpc("add_tenant_note", { p_tenant: tenantId, p_body: note }); setNote(""); d.reload(); }, "Catatan tersimpan.");
  const toggleOwner = () => a.run(async () => {
    await api.rpc("set_member_active", { p_profile: t.owner_id, p_active: t.owner_active === false, p_reason: off ?? "" });
    setOff(null);
    reload();
  }, t.owner_active === false ? "Login Owner diaktifkan kembali." : "Login Owner dinonaktifkan.");
  return (
    <Modal open title={t.name} onClose={onClose} footer={<button type="button" className="d-btn d-btn--ghost" onClick={onClose}>Tutup</button>}>
      <div className="svc-detail">
        <section>
          <h3>Profil</h3>
          <dl className="svc-dl">
            <div><dt>Owner</dt><dd>{t.owner_name ?? "—"} · {t.owner_email ?? "—"}</dd></div>
            <div><dt>Terakhir masuk</dt><dd>{t.owner_id ? `${ago(t.owner_last_login)}` : "Belum ada akun"}</dd></div>
            <div><dt>Terdaftar</dt><dd>{date(t.created_at)}</dd></div>
            <div><dt>Skor kesehatan</dt><dd><HealthPill health={health.h} /></dd></div>
          </dl>
          {health.h.reasons.length > 0 && <ul className="svc-reasons">{health.h.reasons.map((x) => <li key={x}>{x}</li>)}</ul>}
          {t.owner_id && (off === null
            ? <button type="button" className={`d-btn d-btn--sm ${t.owner_active === false ? "d-btn--ghost" : "d-btn--danger-ghost"}`} onClick={() => (t.owner_active === false ? toggleOwner() : setOff(""))}>{t.owner_active === false ? "Aktifkan login Owner" : "Nonaktifkan login Owner"}</button>
            : <div className="d-row-actions"><input className="d-date" aria-label="Alasan" placeholder="Alasan (min. 3 huruf)" value={off} onChange={(e) => setOff(e.target.value)} />
                <button type="button" className="d-btn d-btn--danger d-btn--sm" disabled={a.busy || off.trim().length < 3} onClick={toggleOwner}>Nonaktifkan</button>
                <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={() => setOff(null)}>Batal</button></div>)}
        </section>
        <section>
          <h3>Langganan &amp; tagihan</h3>
          <div className="d-row-actions svc-left">
            <select className="d-date" aria-label="Paket" value={plan} onChange={(e) => setPlan(e.target.value)}><option value="">Belum dipilih</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <button type="button" className="d-btn d-btn--ghost d-btn--sm" disabled={a.busy || plan === (tenantRow?.plan_id ?? "")} onClick={savePlan}>Ubah paket</button>
          </div>
          {d.loading && !d.data ? <Loading /> : d.data?.inv.length ? (
            <ul className="d-list">{d.data.inv.map((i) => <li key={i.id}><div><p className="d-list__title">{date(i.period)}</p></div><span><Badge tone={i.status === "paid" ? "ok" : "warn"}>{i.status === "paid" ? "Lunas" : "Belum bayar"}</Badge> <span className="d-num">{rupiah(i.amount)}</span></span></li>)}</ul>
          ) : <p className="d-text d-muted">Belum ada tagihan.</p>}
        </section>
        <section>
          <h3>Riwayat tiket</h3>
          {d.data?.tickets.length ? <ul className="d-list">{d.data.tickets.map((x) => <li key={x.id}><div><p className="d-list__title">{x.subject}</p><p className="d-list__meta">{x.code} · {x.category} · {ago(x.created_at)}</p></div><Badge tone={x.status === "resolved" ? "ok" : "warn"}>{x.status === "resolved" ? "Selesai" : "Terbuka"}</Badge></li>)}</ul> : <p className="d-text d-muted">Belum ada tiket.</p>}
        </section>
        <section>
          <h3>Aktivitas terbaru</h3>
          {d.data?.audit.length ? <ul className="d-list">{d.data.audit.map((x) => <li key={x.id}><div><p className="d-list__title">{auditText(x)}</p><p className="d-list__meta">{x.actor_role ?? "sistem"} · {dateTime(x.created_at)}</p></div></li>)}</ul> : <p className="d-text d-muted">Belum ada aktivitas tercatat.</p>}
        </section>
        <section>
          <h3>Catatan internal CS <span className="d-muted">· tidak terlihat Owner</span></h3>
          <div className="d-row-actions svc-left"><input className="d-date svc-grow" aria-label="Catatan baru" placeholder="Tulis catatan…" value={note} onChange={(e) => setNote(e.target.value)} />
            <button type="button" className="d-btn d-btn--ghost d-btn--sm" disabled={a.busy || !note.trim()} onClick={addNote}>Simpan</button></div>
          {d.data?.notes.length ? <ul className="d-list">{d.data.notes.map((n) => <li key={n.id}><div><p className="d-list__title">{n.body}</p><p className="d-list__meta">{dateTime(n.created_at)}</p></div></li>)}</ul> : null}
        </section>
        <Feedback a={a} />
      </div>
    </Modal>
  );
}

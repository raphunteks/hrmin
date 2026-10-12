import { useMemo, useState } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { dateTime } from "../../../lib/format.js";
import { inviteStatus, INVITE_STATUS, auditText } from "../../../lib/watch.js";
import { PageHead, Panel, Stat, Loading, ErrorNote, Badge, Modal, Field, Empty, useAsync } from "../../ui/index.jsx";
import { useAction, Feedback, useBranch, useLive } from "../../ops.jsx";
import { ServiceTabs, ago, branchesOfPerson } from "./shared.jsx";
import AssignBranches from "./AssignBranches.jsx";

const ROLE_NAME = { gm: "General Manager", staff: "Kasir / Staf", dokter: "Dokter" };

/**
 * Owner · Kelola GM & Kasir/Staf  |  GM · Kelola Kasir Cabang.
 * Hierarki ditegakkan di database (set_member_active, create_invite, guard_profile_role); UI hanya menyembunyikan yang pasti ditolak.
 */
export default function Team() {
  const { api, role, tenantId, tenant } = useAuth();
  const isOwner = role === "owner";
  const mine = useBranch();
  const r = useAsync(async () => {
    const [people, branches, mb, invites] = await Promise.all([
      api.list("profiles", { eq: { tenant_id: tenantId }, order: ["full_name"] }),
      api.list("branches", { eq: { tenant_id: tenantId } }),
      api.list("member_branches", { eq: { tenant_id: tenantId } }),
      api.list("staff_invites", { order: ["created_at", "desc"] }),
    ]);
    return { people, branches, mb, invites };
  }, [api, tenantId]);
  useLive(["profiles", "member_branches", "staff_invites"], r.reload);
  const a = useAction();
  const [assign, setAssign] = useState(null);
  const [off, setOff] = useState(null);     // { person, reason }
  const [pin, setPin] = useState(null);     // { person, value }
  const [hist, setHist] = useState(null);   // person
  const [inv, setInv] = useState(null);
  const [q, setQ] = useState("");

  const myBranchIds = useMemo(() => new Set(mine.options.map((b) => b.id)), [mine.options]);
  const roles = isOwner ? ["gm", "staff", "dokter"] : ["staff", "dokter"];
  const reach = (p) => {
    if (isOwner) return true;
    const ids = branchesOfPerson(p, r.data?.mb ?? []);
    return ids ? ids.some((id) => myBranchIds.has(id)) : true;
  };
  const people = (r.data?.people ?? []).filter((p) => roles.includes(p.role) && reach(p)
    && (!q || `${p.full_name} ${p.email ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const brName = (id) => r.data?.branches.find((b) => b.id === id)?.name;
  const invites = (r.data?.invites ?? []).filter((i) => roles.includes(i.role) && !i.accepted_at);
  const active = people.filter((p) => p.is_active !== false).length;

  const statusOf = (p) => (p.is_active === false ? ["Nonaktif", "danger"] : !p.last_login_at ? ["Belum pernah masuk", "warn"] : ["Aktif", "ok"]);

  const invite = () => a.run(async () => {
    const f = inv;
    const created = await api.rpc("create_invite", { p_email: f.email, p_full_name: f.name, p_role: f.role, p_branches: [...f.branches], p_phone: f.phone || null });
    setInv(null);
    r.reload();
    try {
      await api.sendInvite(created.id);
      return `Undangan dikirim ke ${f.email} (berlaku 48 jam).`;
    } catch (e) {
      return `Undangan dibuat tetapi belum terkirim (${e.message}). Gunakan “Kirim ulang”.`;
    }
  }, (m) => m);

  const roleOptions = roles.filter((x) => x !== "dokter" || tenant?.pillar === "health");
  const openInvite = () => {
    a.setError(null); a.setOk(null);
    setInv({ name: "", email: "", phone: "", role: roleOptions.includes("staff") ? "staff" : roleOptions[0], branches: new Set(mine.options.length === 1 ? [mine.options[0].id] : []) });
  };
  const needBranch = inv && inv.role !== "gm";

  return (
    <>
      <PageHead eyebrow={`${isOwner ? "Owner" : "General Manager"} · Layanan & Akses`} title={isOwner ? "Kelola GM & Kasir/Staf" : "Kelola Kasir Cabang"}
        desc={isOwner ? "Undang, tempatkan, dan nonaktifkan GM, Kasir/Staf, dan Dokter. Riwayat transaksi tetap menunjuk ke orang yang sama — akun dinonaktifkan, bukan dihapus."
          : "Kelola Kasir di cabang yang Anda pegang. Peran GM dan Owner tidak dapat Anda ubah."}
        actions={<button type="button" className="d-btn d-btn--primary" onClick={openInvite}>Undang anggota</button>} />
      <ServiceTabs />
      {r.loading && !r.data ? <Loading /> : r.error ? <ErrorNote error={r.error} onRetry={r.reload} /> : (
        <>
          <div className="d-stats">
            <Stat label="Anggota" value={people.length} sub={`${active} aktif`} />
            <Stat label="Nonaktif" value={people.length - active} sub="riwayat tetap tersimpan" />
            <Stat label="Undangan menunggu" value={invites.filter((i) => ["pending", "queued"].includes(inviteStatus(i))).length} sub="belum diterima" />
            <Stat label="Cabang dipegang" value={mine.options.length} sub={isOwner ? "semua cabang" : mine.locked ? "dibatasi Owner" : "semua cabang"} />
          </div>
          <Feedback a={a} />
          <Panel title={isOwner ? "GM, Kasir/Staf & Dokter" : "Kasir cabang"} meta={`${people.length} orang`} actions={
            <input className="d-date" type="search" placeholder="Cari nama atau email" aria-label="Cari" value={q} onChange={(e) => setQ(e.target.value)} />}>
            {people.length === 0 ? <Empty title="Belum ada anggota">Klik “Undang anggota” untuk menambah.</Empty> : (
              <div className="d-table-wrap"><table className="d-table">
                <thead><tr><th scope="col">Nama</th><th scope="col">Peran</th><th scope="col">Cabang</th><th scope="col">Status</th><th scope="col">Terakhir aktif</th><th scope="col"><span className="sr-only">Aksi</span></th></tr></thead>
                <tbody>{people.map((p) => {
                  const ids = branchesOfPerson(p, r.data.mb);
                  const [sl, st] = statusOf(p);
                  return (
                    <tr key={p.id} className={p.is_active === false ? "is-muted" : undefined}>
                      <td>{p.full_name}<p className="d-list__meta">{p.email}</p></td>
                      <td>{ROLE_NAME[p.role]}</td>
                      <td>{ids ? ids.map(brName).filter(Boolean).join(", ") || "—" : "Semua cabang"}</td>
                      <td><Badge tone={st}>{sl}</Badge>{p.is_active === false && p.deactivation_reason && <p className="d-list__meta">{p.deactivation_reason}</p>}</td>
                      <td>{p.last_login_at ? ago(p.last_login_at) : "—"}</td>
                      <td><div className="d-row-actions">
                        {p.is_active !== false && <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={() => setAssign({ person: p, ids })}>Atur cabang</button>}
                        {isOwner && p.role === "gm" && p.is_active !== false && <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={() => { a.setError(null); setPin({ person: p, value: "" }); }}>Reset PIN</button>}
                        {isOwner && <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={() => setHist(p)}>Riwayat</button>}
                        {p.is_active === false
                          ? <button type="button" className="d-btn d-btn--ghost d-btn--sm" disabled={a.busy} onClick={() => a.run(async () => { await api.rpc("set_member_active", { p_profile: p.id, p_active: true }); r.reload(); }, `${p.full_name} diaktifkan kembali.`)}>Aktifkan</button>
                          : <button type="button" className="d-btn d-btn--danger-ghost d-btn--sm" onClick={() => { a.setError(null); setOff({ person: p, reason: "" }); }}>Nonaktifkan</button>}
                      </div></td>
                    </tr>);
                })}</tbody>
              </table></div>
            )}
          </Panel>
          <Panel title="Undangan" meta="Tautan sekali pakai, berlaku 48 jam">
            {invites.length === 0 ? <p className="d-text d-muted">Tidak ada undangan yang menunggu.</p> : (
              <div className="d-table-wrap"><table className="d-table">
                <thead><tr><th scope="col">Penerima</th><th scope="col">Peran</th><th scope="col">Cabang</th><th scope="col">Status</th><th scope="col">Berlaku s.d.</th><th scope="col"><span className="sr-only">Aksi</span></th></tr></thead>
                <tbody>{invites.map((i) => {
                  const k = inviteStatus(i), [sl, st] = INVITE_STATUS[k], openInv = !i.revoked_at;
                  return (
                    <tr key={i.id}>
                      <td>{i.full_name}<p className="d-list__meta">{i.email}</p></td>
                      <td>{ROLE_NAME[i.role]}</td>
                      <td>{i.branch_ids.length ? i.branch_ids.map(brName).filter(Boolean).join(", ") : "Semua cabang"}</td>
                      <td><Badge tone={st}>{sl}</Badge></td>
                      <td>{dateTime(i.expires_at)}</td>
                      <td><div className="d-row-actions">
                        {openInv && <button type="button" className="d-btn d-btn--ghost d-btn--sm" disabled={a.busy} onClick={() => a.run(async () => { await api.rpc("resend_invite", { p_id: i.id }); await api.sendInvite(i.id); r.reload(); }, "Undangan dikirim ulang.")}>Kirim ulang</button>}
                        {openInv && <button type="button" className="d-btn d-btn--danger-ghost d-btn--sm" disabled={a.busy} onClick={() => a.run(async () => { await api.rpc("revoke_invite", { p_id: i.id }); r.reload(); }, "Undangan dicabut.")}>Cabut</button>}
                      </div></td>
                    </tr>);
                })}</tbody>
              </table></div>
            )}
          </Panel>
          <p className="d-text d-muted svc-foot">
            Atur batas diskon, batas void, dan jam operasional di <a href="/app/layanan/kebijakan" className="d-link">Kebijakan Berjenjang (3 Lapis)</a>. Tinjau permintaan di <a href="/app/persetujuan" className="d-link">Pusat Persetujuan Terpadu</a>.
          </p>
        </>
      )}

      {assign && <AssignBranches person={assign.person} initial={assign.ids} options={mine.options} onClose={() => setAssign(null)} onSaved={r.reload} />}

      <Modal open={Boolean(inv)} title="Undang anggota" onClose={() => setInv(null)}
        footer={<><button type="button" className="d-btn d-btn--ghost" onClick={() => setInv(null)}>Batal</button>
          <button type="button" className="d-btn d-btn--primary" disabled={a.busy || !inv?.name || !inv?.email || (needBranch && inv.branches.size === 0)} onClick={invite}>Kirim undangan</button></>}>
        {inv && (
          <div className="d-form">
            <div className="d-form__row">
              <Field label="Nama lengkap" id="i-name"><input id="i-name" value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} /></Field>
              <Field label="Peran" id="i-role"><select id="i-role" value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value })}>{roleOptions.map((x) => <option key={x} value={x}>{ROLE_NAME[x]}</option>)}</select></Field>
            </div>
            <div className="d-form__row">
              <Field label="Email" id="i-email"><input id="i-email" type="email" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} /></Field>
              <Field label="WhatsApp (opsional)" id="i-phone"><input id="i-phone" inputMode="tel" value={inv.phone} onChange={(e) => setInv({ ...inv, phone: e.target.value })} /></Field>
            </div>
            <fieldset className="d-checks">
              <legend>{needBranch ? "Cabang (wajib, minimal satu)" : "Cabang (kosong = semua cabang)"}</legend>
              {mine.options.map((b) => (
                <label key={b.id} className="d-check"><input type="checkbox" checked={inv.branches.has(b.id)}
                  onChange={(e) => setInv((x) => { const n = new Set(x.branches); e.target.checked ? n.add(b.id) : n.delete(b.id); return { ...x, branches: n }; })} />{b.name}</label>))}
            </fieldset>
            <Feedback a={a} />
          </div>
        )}
      </Modal>

      <Modal open={Boolean(off)} title={`Nonaktifkan ${off?.person.full_name ?? ""}`} onClose={() => setOff(null)}
        footer={<><button type="button" className="d-btn d-btn--ghost" onClick={() => setOff(null)}>Batal</button>
          <button type="button" className="d-btn d-btn--danger" disabled={a.busy || (off?.reason ?? "").trim().length < 3}
            onClick={() => a.run(async () => { await api.rpc("set_member_active", { p_profile: off.person.id, p_active: false, p_reason: off.reason }); setOff(null); r.reload(); }, "Akun dinonaktifkan.")}>Nonaktifkan</button></>}>
        {off && (
          <div className="d-form">
            <p className="d-text">Orang ini langsung tidak bisa membaca atau menulis data. Shift kasir yang masih terbuka harus ditutup lebih dulu. Riwayat transaksi tetap utuh.</p>
            <Field label="Alasan" id="off-reason"><input id="off-reason" value={off.reason} onChange={(e) => setOff({ ...off, reason: e.target.value })} /></Field>
            <Feedback a={a} />
          </div>
        )}
      </Modal>

      <Modal open={Boolean(pin)} title={`Reset PIN · ${pin?.person.full_name ?? ""}`} onClose={() => setPin(null)}
        footer={<><button type="button" className="d-btn d-btn--ghost" onClick={() => setPin(null)}>Batal</button>
          <button type="button" className="d-btn d-btn--primary" disabled={a.busy || !/^[0-9]{6}$/.test(pin?.value ?? "")}
            onClick={() => a.run(async () => { await api.rpc("reset_member_pin", { p_profile: pin.person.id, p_pin: pin.value }); setPin(null); }, "PIN otorisasi diperbarui. Sampaikan PIN baru langsung ke GM.")}>Simpan PIN</button></>}>
        {pin && (
          <div className="d-form">
            <p className="d-text">PIN otorisasi dipakai GM untuk menyetujui void, refund, dan diskon besar. PIN baru tidak dicatat di log.</p>
            <Field label="PIN baru (6 digit)" id="pin-new"><input id="pin-new" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin.value} onChange={(e) => setPin({ ...pin, value: e.target.value.replace(/\D/g, "") })} /></Field>
            <Feedback a={a} />
          </div>
        )}
      </Modal>

      {hist && <History person={hist} tenantId={tenantId} onClose={() => setHist(null)} />}
    </>
  );
}

function History({ person, tenantId, onClose }) {
  const { api } = useAuth();
  const d = useAsync(() => api.listAudit({ tenantId, limit: 300 }), [api, tenantId]);
  const rows = (d.data ?? []).filter((x) => x.entity_id === person.id || x.actor_id === person.id && x.action === "login").slice(0, 30);
  return (
    <Modal open title={`Riwayat · ${person.full_name}`} onClose={onClose} footer={<button type="button" className="d-btn d-btn--ghost" onClick={onClose}>Tutup</button>}>
      {d.loading ? <Loading /> : rows.length === 0 ? <p className="d-text d-muted">Belum ada perubahan tercatat.</p> : (
        <ul className="d-list">{rows.map((x) => <li key={x.id}><div><p className="d-list__title">{auditText(x)}</p><p className="d-list__meta">{x.actor_role ?? "sistem"} · {dateTime(x.created_at)}</p></div></li>)}</ul>
      )}
    </Modal>
  );
}

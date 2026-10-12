import { useState } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { can } from "../../../lib/rbac.js";
import { dateTime } from "../../../lib/format.js";
import { PageHead, Panel, Loading, ErrorNote, useAsync, Empty, Badge, Modal, Field } from "../../ui/index.jsx";
import { useAction, Feedback, useIndex } from "../../ops.jsx";

const getPos = () => new Promise((res, rej) => {
  if (!navigator.geolocation) return rej(new Error("Perangkat tidak mendukung GPS"));
  navigator.geolocation.getCurrentPosition((p) => res(p.coords), () => rej(new Error("Izin lokasi ditolak atau GPS tidak tersedia")), { enableHighAccuracy: true, timeout: 10000 });
});
const localInput = (iso) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export default function Attendance() {
  const { api, profile, role, tenant } = useAuth();
  const a = useAction();
  const [selfie, setSelfie] = useState(null);
  const [fix, setFix] = useState(null); // { row, at, reason }
  const r = useAsync(async () => {
    const [rows, branches, people] = await Promise.all([
      api.list("attendance", { order: ["created_at", "desc"], limit: 60 }),
      api.list("branches"),
      api.list("profiles").catch(() => []),
    ]);
    return { rows, branches, people };
  }, [api]);
  const br = useIndex(r.data?.branches);
  const ppl = useIndex(r.data?.people);
  const me = ppl[profile.id];
  const consented = Boolean(me?.attendance_consent_at);
  const mine = (r.data?.rows ?? []).filter((x) => x.profile_id === profile.id);
  const last = mine[0];
  const nextKind = last && last.kind === "in" && new Date(last.created_at).toDateString() === new Date().toDateString() ? "out" : "in";
  const home = r.data?.branches.find((x) => x.id === profile.branch_id);
  const selfieRequired = Boolean(tenant?.attendance_selfie_required);
  const canFix = can(role, 13, "u");

  const clock = (demo) => a.run(async () => {
    if (selfieRequired && !selfie) throw new Error("Ambil selfie dulu — tenant ini mewajibkannya.");
    const c = demo ? { latitude: home.lat + 0.00005, longitude: home.lng, accuracy: 8 } : await getPos();
    let path = null;
    if (selfie) path = api.upload ? await api.upload("selfies", selfie) : `selfies/demo-${Date.now()}.jpg`;
    await api.rpc("clock", { p_kind: nextKind, p_lat: c.latitude, p_lng: c.longitude, p_accuracy: Math.round(c.accuracy ?? 0) || null, p_selfie: path });
    setSelfie(null);
    r.reload();
  }, nextKind === "in" ? "Absen masuk tercatat" : "Absen pulang tercatat");

  const consent = () => a.run(async () => { await api.rpc("give_attendance_consent", {}); r.reload(); }, "Persetujuan tersimpan");
  const saveFix = () => a.run(async () => {
    await api.rpc("correct_attendance", { p_id: fix.row.id, p_at: new Date(fix.at).toISOString(), p_reason: fix.reason });
    setFix(null);
    r.reload();
  }, "Absen dikoreksi dan tercatat di audit");

  return (
    <>
      <PageHead eyebrow="Fitur 13 · Absen GPS" title="Absensi" desc="Absen hanya sah dalam radius cabang dengan akurasi GPS yang memadai. Telat dan lembur dihitung dari jadwal kerja dan masuk ke payroll." />
      {r.loading && !r.data ? <Loading /> : r.error ? <ErrorNote error={r.error} onRetry={r.reload} /> : (
        <div className="d-grid d-grid--wide">
          <Panel title="Riwayat absensi">
            {r.data.rows.length === 0 ? <Empty title="Belum ada absensi" /> : (
              <ul className="d-list">{r.data.rows.map((x) => (
                <li key={x.id}>
                  <div>
                    <p className="d-list__title">{ppl[x.profile_id]?.full_name ?? (x.profile_id === profile.id ? profile.full_name : "Karyawan")} · {x.kind === "in" ? "Masuk" : "Pulang"}</p>
                    <p className="d-list__meta">{br[x.branch_id]?.name} · {dateTime(x.created_at)}{x.selfie_path && " · selfie"}{x.corrected_by && ` · dikoreksi: ${x.correction_reason}`}</p>
                  </div>
                  <span className="d-row-actions">
                    {x.late_min > 0 && <Badge tone="warn">telat {x.late_min} mnt</Badge>}
                    {x.overtime_min > 0 && <Badge tone="accent">lembur {x.overtime_min} mnt</Badge>}
                    <Badge tone="ok">{x.distance_m} m</Badge>
                    {canFix && x.profile_id !== profile.id && (
                      <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={() => setFix({ row: x, at: localInput(x.created_at), reason: "" })}>Koreksi</button>
                    )}
                  </span>
                </li>
              ))}</ul>
            )}
          </Panel>
          {profile.branch_id && (
            <Panel title={nextKind === "in" ? "Absen masuk" : "Absen pulang"} meta={home?.name}>
              <p className="d-text">Lokasi Anda dibandingkan dengan titik {home?.name}. Akurasi GPS harus ≤ 100 m.</p>
              {(selfieRequired || selfie || consented) && (
                <Field label={selfieRequired ? "Selfie (wajib)" : "Selfie (opsional)"} id="at-selfie" hint="Disimpan di bucket privat tenant. Hanya diproses dengan persetujuan Anda.">
                  {consented ? (
                    <input id="at-selfie" type="file" accept="image/*" capture="user" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} />
                  ) : (
                    <button type="button" className="d-btn d-btn--ghost d-btn--sm" disabled={a.busy} onClick={consent}>Saya setuju foto selfie dan lokasi saya diproses untuk absensi</button>
                  )}
                </Field>
              )}
              {!selfieRequired && !consented && !selfie && (
                <p className="d-text d-muted">Selfie tidak diwajibkan. <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={consent}>Aktifkan selfie (beri persetujuan)</button></p>
              )}
              <div className="d-form__actions">
                {api.mode === "demo" && <button type="button" className="d-btn d-btn--ghost" disabled={a.busy} onClick={() => clock(true)}>Pakai lokasi cabang (demo)</button>}
                <button type="button" className="d-btn d-btn--primary" disabled={a.busy || (selfieRequired && !selfie)} onClick={() => clock(false)}>{a.busy ? "Mengambil lokasi…" : nextKind === "in" ? "Absen masuk" : "Absen pulang"}</button>
              </div>
              <Feedback a={a} />
            </Panel>
          )}
        </div>
      )}
      <Modal open={Boolean(fix)} title="Koreksi absen" onClose={() => setFix(null)}
        footer={<><button type="button" className="d-btn d-btn--ghost" onClick={() => setFix(null)}>Batal</button><button type="button" className="d-btn d-btn--primary" disabled={a.busy || (fix?.reason ?? "").trim().length < 5} onClick={saveFix}>Simpan koreksi</button></>}>
        {fix && (
          <div className="d-form">
            <p className="d-text">{ppl[fix.row.profile_id]?.full_name} · {fix.row.kind === "in" ? "Masuk" : "Pulang"} · semula {dateTime(fix.row.created_at)}</p>
            <Field label="Waktu yang benar" id="fx-at"><input id="fx-at" type="datetime-local" value={fix.at} onChange={(e) => setFix({ ...fix, at: e.target.value })} /></Field>
            <Field label="Alasan (wajib)" id="fx-r" hint="Tercatat di audit bersama waktu sebelum dan sesudah."><textarea id="fx-r" rows="2" value={fix.reason} onChange={(e) => setFix({ ...fix, reason: e.target.value })} /></Field>
            <Feedback a={a} />
          </div>
        )}
      </Modal>
    </>
  );
}

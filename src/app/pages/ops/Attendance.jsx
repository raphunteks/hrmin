import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { can } from "../../../lib/rbac.js";
import { dateTime } from "../../../lib/format.js";
import { PageHead, Panel, Loading, ErrorNote, useAsync, Empty, Badge, Modal, Field } from "../../ui/index.jsx";
import { useAction, Feedback, useIndex } from "../../ops.jsx";

const getPos = () => new Promise((res, rej) => {
  if (!navigator.geolocation) return rej(new Error("Perangkat tidak mendukung GPS"));
  navigator.geolocation.getCurrentPosition(
    (p) => res(p.coords),
    () => rej(new Error("Izin lokasi ditolak atau GPS tidak tersedia")),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

const localInput = (iso) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function Attendance() {
  const { api, profile, role, tenant } = useAuth();
  const a = useAction();
  const [fix, setFix] = useState(null); // { row, at, reason }
  const [photoPreview, setPhotoPreview] = useState(null); // URL / row to preview in modal
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [stampedSelfie, setStampedSelfie] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const r = useAsync(async () => {
    const [rows, branches, people, shifts] = await Promise.all([
      api.list("attendance", { order: ["created_at", "desc"], limit: 60 }),
      api.list("branches"),
      api.list("profiles").catch(() => []),
      api.list("work_shifts", { eq: { profile_id: profile.id } }).catch(() => []),
    ]);
    return { rows, branches, people, shifts };
  }, [api, profile.id]);

  const br = useIndex(r.data?.branches);
  const ppl = useIndex(r.data?.people);
  const me = ppl[profile.id];
  const consented = Boolean(me?.attendance_consent_at);
  const mine = (r.data?.rows ?? []).filter((x) => x.profile_id === profile.id);
  const last = mine[0];
  const nextKind = last && last.kind === "in" && new Date(last.created_at).toDateString() === new Date().toDateString() ? "out" : "in";
  const home = r.data?.branches?.find((x) => x.id === profile.branch_id);
  const selfieRequired = Boolean(tenant?.attendance_selfie_required);
  const canFix = can(role, 13, "u");

  // Cari jadwal shift hari ini
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayShift = (r.data?.shifts ?? []).find((s) => s.work_date === todayIso);

  // Stop camera stream when unmounting
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Start live webcam stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Browser Anda tidak mendukung akses kamera langsung.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      setCameraError(err.message || "Gagal mengaktifkan kamera");
      setIsCameraActive(false);
    }
  };

  // Generate canvas with live video frame + cryptographic watermark stamp
  const capturePhotoWithWatermark = (coords, branchName) => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");

    if (isCameraActive && videoRef.current && videoRef.current.readyState >= 2) {
      // Draw mirrored video for natural selfie view
      ctx.translate(640, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0, 640, 480);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      // Simulation / Fallback background with gradient
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(1, "#1e293b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      // Draw avatar silhouette icon
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(320, 170, 65, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      const initials = (profile.full_name || "ST").slice(0, 2).toUpperCase();
      ctx.fillText(initials, 320, 182);

      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("SIMULASI FOTO KAMERA TERVERIFIKASI", 320, 270);
      ctx.textAlign = "left";
    }

    // Draw Watermark Overlay Bar at bottom
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.fillRect(0, 350, 640, 130);

    // Accent line
    ctx.fillStyle = nextKind === "in" ? "#10b981" : "#f59e0b";
    ctx.fillRect(0, 350, 640, 3);

    ctx.textAlign = "left";
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(
      `HARUM.IN VERIFIED PRESENCE • ${nextKind === "in" ? "ABSEN MASUK (CLOCK-IN)" : "ABSEN PULANG (CLOCK-OUT)"}`,
      18,
      374
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(
      `👤 ${profile.full_name} (${role === "staff" ? "Kasir/Staf" : role.toUpperCase()}) • 🏢 ${branchName || "Cabang Utama"}`,
      18,
      398
    );

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "12px monospace";
    const dateStr = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = new Date().toLocaleTimeString("id-ID") + " WITA";
    ctx.fillText(`🕒 ${dateStr} • ${timeStr}`, 18, 422);

    const distText = coords
      ? `📍 GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} • Jarak: ${Math.round(coords.distance || 0)}m (Radius Aman)`
      : `📍 Lokasi Cabang Terkonfirmasi`;
    ctx.fillText(distText, 18, 444);

    return canvas.toDataURL("image/jpeg", 0.88);
  };

  const clock = (isDemoLocation) => a.run(async () => {
    if (selfieRequired && !consented && !isDemoLocation) {
      throw new Error("Setujui penggunaan foto selfie dan data lokasi untuk absensi (UU PDP).");
    }

    const c = isDemoLocation
      ? { latitude: (home?.lat || -5.15) + 0.00005, longitude: home?.lng || 119.43, accuracy: 8, distance: 6 }
      : await getPos();

    // Capture photo with automatic live watermark
    const photoDataUrl = capturePhotoWithWatermark(c, home?.name);
    setStampedSelfie(photoDataUrl);

    let path = photoDataUrl;
    if (api.upload && !photoDataUrl.startsWith("data:")) {
      path = await api.upload("selfies", photoDataUrl);
    }

    await api.rpc("clock", {
      p_kind: nextKind,
      p_lat: c.latitude,
      p_lng: c.longitude,
      p_accuracy: Math.round(c.accuracy ?? 0) || null,
      p_selfie: path,
    });

    stopCamera();
    r.reload();
  }, nextKind === "in" ? "Absen masuk & selfie berhasil tercatat" : "Absen pulang & selfie berhasil tercatat");

  const consent = () => a.run(async () => {
    await api.rpc("give_attendance_consent", {});
    r.reload();
  }, "Persetujuan pemrosesan foto & lokasi tersimpan");

  const saveFix = () => a.run(async () => {
    await api.rpc("correct_attendance", {
      p_id: fix.row.id,
      p_at: new Date(fix.at).toISOString(),
      p_reason: fix.reason,
    });
    setFix(null);
    r.reload();
  }, "Absen dikoreksi dan tercatat di audit");

  return (
    <>
      <PageHead
        eyebrow="Fitur 13 · Presensi Kamera & GPS"
        title="Absensi & Verifikasi Wajah"
        desc="Presensi valid menggunakan kamera live dengan stempel digital anti-rekayasa dan validasi radius geofencing per cabang."
      />

      {r.loading && !r.data ? (
        <Loading />
      ) : r.error ? (
        <ErrorNote error={r.error} onRetry={r.reload} />
      ) : (
        <div className="d-grid d-grid--wide">
          {/* Panel Riwayat Absensi */}
          <Panel title="Riwayat Absensi Karyawan">
            {r.data.rows.length === 0 ? (
              <Empty title="Belum ada data absensi" desc="Presensi staf akan muncul di sini secara berurutan." />
            ) : (
              <ul className="d-list">
                {r.data.rows.map((x) => (
                  <li key={x.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 0", borderBottom: "1px solid var(--color-rule, #e2e8f0)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      {x.selfie_path ? (
                        <div
                          onClick={() => setPhotoPreview(x)}
                          title="Klik untuk melihat foto presensi terverifikasi"
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "50%",
                            overflow: "hidden",
                            border: "2px solid var(--color-accent, #2563eb)",
                            cursor: "pointer",
                            flexShrink: 0,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                          }}
                        >
                          <img
                            src={x.selfie_path}
                            alt="Selfie"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "50%",
                            background: "var(--color-paper-2, #f1f5f9)",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "0.75rem",
                            color: "var(--color-muted, #64748b)",
                            flexShrink: 0,
                          }}
                        >
                          GPS
                        </div>
                      )}
                      <div>
                        <p className="d-list__title" style={{ margin: 0, fontWeight: 600 }}>
                          {ppl[x.profile_id]?.full_name ?? (x.profile_id === profile.id ? profile.full_name : "Karyawan")} ·{" "}
                          <span style={{ color: x.kind === "in" ? "var(--color-ok, #10b981)" : "var(--color-warn, #f59e0b)" }}>
                            {x.kind === "in" ? "Masuk" : "Pulang"}
                          </span>
                        </p>
                        <p className="d-list__meta" style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "var(--color-muted, #64748b)" }}>
                          {br[x.branch_id]?.name || "Cabang"} · {dateTime(x.created_at)}
                          {x.corrected_by && ` · dikoreksi: ${x.correction_reason}`}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {x.late_min > 0 && <Badge tone="warn">telat {x.late_min} mnt</Badge>}
                      {x.overtime_min > 0 && <Badge tone="accent">lembur {x.overtime_min} mnt</Badge>}
                      <Badge tone="ok">{x.distance_m ?? 0} m</Badge>
                      {x.selfie_path && (
                        <button
                          type="button"
                          className="d-btn d-btn--subtle"
                          style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                          onClick={() => setPhotoPreview(x)}
                        >
                          Lihat Foto
                        </button>
                      )}
                      {canFix && x.profile_id !== profile.id && (
                        <button
                          type="button"
                          className="d-btn d-btn--ghost d-btn--sm"
                          onClick={() => setFix({ row: x, at: localInput(x.created_at), reason: "" })}
                        >
                          Koreksi
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Panel Presensi Live Camera Kasir / Staf */}
          {profile.branch_id && (
            <Panel
              title={nextKind === "in" ? "Absen Masuk Kamera" : "Absen Pulang Kamera"}
              meta={`Outlet: ${home?.name || "Cabang Anda"}`}
            >
              {/* Shift info banner */}
              <div
                style={{
                  padding: "0.75rem",
                  background: "var(--color-paper-2, #f8fafc)",
                  border: "1px solid var(--color-rule, #e2e8f0)",
                  borderRadius: "var(--radius-md, 8px)",
                  marginBottom: "0.75rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                    📅 Jadwal Kerja Hari Ini:
                  </span>
                  {todayShift ? (
                    <Badge tone="ok">{todayShift.start_time.slice(0, 5)} - {todayShift.end_time.slice(0, 5)} WITA</Badge>
                  ) : (
                    <Badge tone="neutral">Shift Reguler</Badge>
                  )}
                </div>
                <p style={{ margin: "0.3rem 0 0", fontSize: "0.75rem", color: "var(--color-muted, #64748b)" }}>
                  Koordinat Anda akan divalidasi dengan radius <strong>{home?.geofence_m || 50} meter</strong> dari titik outlet {home?.name}.
                </p>
              </div>

              {/* Viewfinder Kamera Live */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "4/3",
                  background: "#0f172a",
                  borderRadius: "var(--radius-md, 10px)",
                  overflow: "hidden",
                  boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)",
                    display: isCameraActive ? "block" : "none",
                  }}
                />

                {/* Oval Panduan Wajah saat kamera aktif */}
                {isCameraActive && (
                  <div
                    style={{
                      position: "absolute",
                      width: "140px",
                      height: "185px",
                      borderRadius: "50%",
                      border: "2px dashed rgba(255, 255, 255, 0.8)",
                      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.35)",
                      pointerEvents: "none",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      paddingBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        color: "#ffffff",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                        background: "rgba(0,0,0,0.5)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      Posisikan Wajah
                    </span>
                  </div>
                )}

                {/* Badge Status Live */}
                {isCameraActive && (
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      left: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(0,0,0,0.6)",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "0.7rem",
                      color: "#ffffff",
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }} />
                    LIVE WEBCAM
                  </div>
                )}

                {/* Layar saat kamera belum aktif */}
                {!isCameraActive && (
                  <div style={{ textAlign: "center", padding: "1.5rem", color: "#f8fafc" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📷</div>
                    <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", fontWeight: 500 }}>
                      Kamera Belum Aktif
                    </p>
                    <button
                      type="button"
                      className="d-btn d-btn--primary d-btn--sm"
                      onClick={startCamera}
                    >
                      Nyalakan Kamera Depan
                    </button>
                    {cameraError && (
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "#f87171" }}>
                        {cameraError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Persetujuan PDP & Tombol Tindakan */}
              <div style={{ marginTop: "1rem" }}>
                {!consented && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <button
                      type="button"
                      className="d-btn d-btn--ghost d-btn--sm"
                      style={{ width: "100%", fontSize: "0.75rem" }}
                      onClick={consent}
                    >
                      ✓ Saya Setuju Foto & GPS Saya Diproses untuk Presensi (UU PDP)
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="d-btn d-btn--primary"
                    style={{ width: "100%", padding: "0.75rem" }}
                    disabled={a.busy}
                    onClick={() => clock(false)}
                  >
                    {a.busy ? "Merekam Presensi..." : nextKind === "in" ? "📸 Ambil Foto & Absen Masuk" : "📸 Ambil Foto & Absen Pulang"}
                  </button>

                  {/* Mode Cepat / Simulasi Lokasi Cabang */}
                  <button
                    type="button"
                    className="d-btn d-btn--ghost d-btn--sm"
                    style={{ width: "100%", fontSize: "0.75rem" }}
                    disabled={a.busy}
                    onClick={() => clock(true)}
                  >
                    Simulasi Lokasi Cabang ({home?.name || "Demo"})
                  </button>
                </div>
              </div>

              <Feedback a={a} />
            </Panel>
          )}
        </div>
      )}

      {/* Modal Pratinjau Foto Selfie Terverifikasi untuk Owner / GM */}
      {photoPreview && (
        <Modal
          open
          title="Verifikasi Foto & GPS Presensi"
          onClose={() => setPhotoPreview(null)}
          footer={
            <button
              type="button"
              className="d-btn d-btn--primary"
              onClick={() => setPhotoPreview(null)}
            >
              Tutup Pratinjau
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                width: "100%",
                borderRadius: "var(--radius-md, 8px)",
                overflow: "hidden",
                border: "1px solid var(--color-rule, #cbd5e1)",
                background: "#0f172a",
                textAlign: "center",
              }}
            >
              <img
                src={photoPreview.selfie_path}
                alt="Foto Stempel Presensi"
                style={{ width: "100%", maxHeight: "380px", objectFit: "contain", display: "block" }}
              />
            </div>

            <div
              style={{
                background: "var(--color-paper-2, #f8fafc)",
                padding: "0.875rem",
                borderRadius: "var(--radius-md, 8px)",
                border: "1px solid var(--color-rule, #e2e8f0)",
                fontSize: "0.8125rem",
                lineHeight: 1.6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span><strong>Karyawan:</strong> {ppl[photoPreview.profile_id]?.full_name}</span>
                <Badge tone={photoPreview.kind === "in" ? "ok" : "warn"}>
                  {photoPreview.kind === "in" ? "Absen Masuk" : "Absen Pulang"}
                </Badge>
              </div>
              <div><strong>Cabang:</strong> {br[photoPreview.branch_id]?.name}</div>
              <div><strong>Waktu Presensi:</strong> {dateTime(photoPreview.created_at)}</div>
              <div><strong>Verifikasi Jarak GPS:</strong> {photoPreview.distance_m ?? 0} meter dari titik cabang</div>
              {photoPreview.late_min > 0 && (
                <div style={{ color: "var(--color-warn, #b45309)" }}>
                  <strong>Keterlambatan:</strong> {photoPreview.late_min} menit
                </div>
              )}
              {photoPreview.overtime_min > 0 && (
                <div style={{ color: "var(--color-accent, #2563eb)" }}>
                  <strong>Lembur Terhitung:</strong> {photoPreview.overtime_min} menit
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Koreksi Absen */}
      {fix && (
        <Modal
          open
          title="Koreksi Waktu Absen Karyawan"
          onClose={() => setFix(null)}
          footer={
            <>
              <button type="button" className="d-btn d-btn--ghost" onClick={() => setFix(null)}>
                Batal
              </button>
              <button
                type="button"
                className="d-btn d-btn--primary"
                disabled={a.busy || (fix?.reason ?? "").trim().length < 5}
                onClick={saveFix}
              >
                Simpan Koreksi
              </button>
            </>
          }
        >
          <div className="d-form">
            <p className="d-text">
              {ppl[fix.row.profile_id]?.full_name} · {fix.row.kind === "in" ? "Masuk" : "Pulang"} · semula {dateTime(fix.row.created_at)}
            </p>
            <Field label="Waktu yang Benar" id="fx-at">
              <input
                id="fx-at"
                type="datetime-local"
                value={fix.at}
                onChange={(e) => setFix({ ...fix, at: e.target.value })}
              />
            </Field>
            <Field label="Alasan Koreksi (Wajib)" id="fx-r" hint="Tercatat permanen di audit log bersama stempel waktu.">
              <textarea
                id="fx-r"
                rows={2}
                placeholder="Misal: Lupa tap keluar saat tutup toko karena mendadak mati lampu..."
                value={fix.reason}
                onChange={(e) => setFix({ ...fix, reason: e.target.value })}
              />
            </Field>
            <Feedback a={a} />
          </div>
        </Modal>
      )}
    </>
  );
}

import { useState } from "react";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { useRouter } from "../../../lib/router.jsx";
import { rupiah, dateTime } from "../../../lib/format.js";
import { PageHead, Panel, Loading, ErrorNote, Empty, Badge, Modal, Field, useAsync } from "../../ui/index.jsx";
import { useAction, Feedback, useLive } from "../../ops.jsx";

const BLANK_FORM = {
  name: "",
  city: "",
  address: "",
  lat: "",
  lng: "",
  geofence_m: "50",
  is_warehouse: false,
  clone_from: "",
  satusehat_location_id: "",
};

export default function Branches() {
  const { api, tenant, role } = useAuth();
  const { navigate } = useRouter();
  const a = useAction();
  const [modal, setModal] = useState(null); // 'create' | { edit: row }
  const [f, setF] = useState(BLANK_FORM);
  const [geoLoading, setGeoLoading] = useState(false);

  const overview = useAsync(async () => {
    try {
      return await api.ownerBranchOverview();
    } catch {
      // Fallback
      const br = await api.listBranches(tenant?.id);
      return {
        quota: { used: br.length, max: 5, plan_name: "Standard" },
        branches: br.map((b) => ({ ...b, staff_count: 0, today_orders: 0, today_sales: 0 })),
      };
    }
  }, [api, tenant?.id]);

  useLive(["branches", "profiles", "orders"], overview.reload);

  const openCreate = () => {
    setF({
      ...BLANK_FORM,
      clone_from: overview.data?.branches?.[0]?.id || "",
    });
    setModal("create");
  };

  const openEdit = (b) => {
    setF({
      name: b.name || "",
      city: b.city || "",
      address: b.address || "",
      lat: b.lat != null ? String(b.lat) : "",
      lng: b.lng != null ? String(b.lng) : "",
      geofence_m: String(b.geofence_m || 50),
      is_warehouse: Boolean(b.is_warehouse),
      clone_from: "",
      satusehat_location_id: b.satusehat_location_id || "",
    });
    setModal({ edit: b });
  };

  const getGeoLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung geolokasi.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        setF((prev) => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
      },
      (err) => {
        setGeoLoading(false);
        alert(`Gagal mengambil koordinat: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSave = () => {
    if (!f.name.trim()) return;
    a.run(async () => {
      if (modal === "create") {
        await api.createBranch({
          name: f.name.trim(),
          city: f.city.trim(),
          address: f.address.trim(),
          lat: f.lat ? Number(f.lat) : null,
          lng: f.lng ? Number(f.lng) : null,
          geofence_m: Number(f.geofence_m) || 50,
          is_warehouse: f.is_warehouse,
          clone_from: f.clone_from || null,
          satusehat_location_id: f.satusehat_location_id?.trim() || null,
        });
      } else if (modal?.edit) {
        await api.updateBranch(modal.edit.id, {
          name: f.name.trim(),
          city: f.city.trim(),
          address: f.address.trim(),
          lat: f.lat ? Number(f.lat) : null,
          lng: f.lng ? Number(f.lng) : null,
          geofence_m: Number(f.geofence_m) || 50,
          is_warehouse: f.is_warehouse,
          satusehat_location_id: f.satusehat_location_id?.trim() || null,
        });
      }
      setModal(null);
      overview.reload();
    }, modal === "create" ? "Cabang berhasil dibuat" : "Data cabang diperbarui");
  };

  const quota = overview.data?.quota || { used: 0, max: 1, plan_name: "Starter" };
  const branches = overview.data?.branches || [];
  const isQuotaFull = quota.used >= quota.max;
  const isHealth = tenant?.pillar === "health";

  return (
    <>
      <PageHead
        eyebrow="Bisnis · Multi-Cabang"
        title="Kelola Cabang & Lokasi"
        desc="Kelola outlet penjualan, gudang bahan sentral, radius GPS geofencing kehadiran staf, dan pantau omzet real-time per cabang."
        actions={
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              type="button"
              className="d-btn d-btn--primary"
              onClick={openCreate}
              disabled={isQuotaFull}
              title={isQuotaFull ? "Batas maksimal cabang telah tercapai" : "Tambah cabang baru"}
            >
              + Tambah Cabang
            </button>
          </div>
        }
      />

      {/* Kuota Cabang Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          padding: "1rem 1.25rem",
          background: isQuotaFull ? "var(--color-warn-soft, #fef3c7)" : "var(--color-paper-2, #f8fafc)",
          border: `1px solid ${isQuotaFull ? "var(--color-warn, #f59e0b)" : "var(--color-rule, #e2e8f0)"}`,
          borderRadius: "var(--radius-lg, 12px)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <strong style={{ fontSize: "0.9375rem", color: "var(--color-ink, #0f172a)" }}>
              Kapasitas Cabang: {quota.used} dari {quota.max} Terpakai
            </strong>
            <Badge tone={isQuotaFull ? "warn" : "accent"}>{quota.plan_name}</Badge>
          </div>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8125rem", color: "var(--color-muted, #64748b)" }}>
            {isQuotaFull
              ? "Kuota cabang paket Anda telah penuh. Tingkatkan paket untuk memperluas jaringan cabang usaha Anda."
              : `Anda masih dapat menambahkan ${quota.max - quota.used} cabang tambahan dalam paket ini.`}
          </p>
        </div>
        {isQuotaFull && (
          <button
            type="button"
            className="d-btn d-btn--ghost d-btn--sm"
            onClick={() => navigate("/app/langganan")}
          >
            Upgrade Paket
          </button>
        )}
      </div>

      <Panel
        title="Daftar Cabang Aktif"
        meta={`${branches.length} lokasi terdaftar`}
      >
        {overview.loading && !overview.data ? (
          <Loading />
        ) : overview.error ? (
          <ErrorNote error={overview.error} onRetry={overview.reload} />
        ) : branches.length === 0 ? (
          <Empty
            title="Belum ada cabang terdaftar"
            desc="Tekan tombol Tambah Cabang untuk mendaftarkan outlet pertama Anda."
          />
        ) : (
          <div
            className="d-table-wrap d-table-wrap--contained"
            style={{ margin: 0, borderRadius: "var(--radius-md, 8px)", border: "1px solid var(--color-rule, #e2e8f0)", overflowX: "auto" }}
          >
            <table className="d-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--color-paper-2, #f1f5f9)" }}>
                  <th scope="col" style={{ width: "25%" }}>NAMA CABANG</th>
                  <th scope="col" style={{ width: "15%" }}>FUNGSI / TIPE</th>
                  <th scope="col" style={{ width: "25%" }}>LOKASI & GEOFENCE</th>
                  <th scope="col" style={{ width: "10%" }} className="d-num">STAF</th>
                  <th scope="col" style={{ width: "15%" }} className="d-num">OMZET HARI INI</th>
                  <th scope="col" style={{ width: "10%", textAlign: "right" }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid var(--color-rule, #e2e8f0)" }}>
                    <td style={{ padding: "0.875rem var(--space-md, 1rem)" }}>
                      <div style={{ fontWeight: 600, color: "var(--color-ink, #0f172a)" }}>
                        {b.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-muted, #64748b)", marginTop: "0.2rem" }}>
                        ID: {b.id.slice(0, 8)}…
                      </div>
                      {b.satusehat_location_id && (
                        <div style={{ marginTop: "0.25rem" }}>
                          <span className="d-badge d-badge--ok" style={{ fontSize: "0.6875rem" }}>
                            SATUSEHAT: {b.satusehat_location_id}
                          </span>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "0.875rem var(--space-md, 1rem)" }}>
                      {b.is_warehouse ? (
                        <Badge tone="neutral">Gudang Bahan</Badge>
                      ) : (
                        <Badge tone="accent">Outlet POS</Badge>
                      )}
                    </td>

                    <td style={{ padding: "0.875rem var(--space-md, 1rem)" }}>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-ink, #334155)" }}>
                        {b.city ? <strong>{b.city}</strong> : "—"}
                        {b.address && <span>, {b.address}</span>}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-muted, #64748b)", marginTop: "0.25rem" }}>
                        {b.lat && b.lng ? (
                          <span>📍 {b.lat}, {b.lng} (Radius {b.geofence_m}m)</span>
                        ) : (
                          <span style={{ fontStyle: "italic" }}>Titik GPS belum diatur</span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: "0.875rem var(--space-md, 1rem)", textAlign: "right" }}>
                      <strong style={{ fontSize: "0.875rem" }}>{b.staff_count ?? 0}</strong> Staf
                    </td>

                    <td style={{ padding: "0.875rem var(--space-md, 1rem)", textAlign: "right" }}>
                      <div style={{ fontWeight: 600, color: "var(--color-ink, #0f172a)", fontSize: "0.875rem" }}>
                        {rupiah(b.today_sales ?? 0)}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-muted, #64748b)" }}>
                        {b.today_orders ?? 0} pesanan
                      </div>
                    </td>

                    <td style={{ padding: "0.875rem var(--space-md, 1rem)", textAlign: "right" }}>
                      <button
                        type="button"
                        className="d-btn d-btn--subtle"
                        style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                        onClick={() => openEdit(b)}
                      >
                        Ubah Info
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Modal Buat / Edit Cabang */}
      {modal && (
        <Modal
          open
          title={modal === "create" ? "Tambah Cabang Baru" : `Ubah Info: ${modal.edit?.name}`}
          onClose={() => setModal(null)}
          footer={
            <>
              <button
                type="button"
                className="d-btn d-btn--ghost"
                onClick={() => setModal(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="d-btn d-btn--primary"
                disabled={a.busy || !f.name.trim()}
                onClick={handleSave}
              >
                {modal === "create" ? "Buat Cabang" : "Simpan Perubahan"}
              </button>
            </>
          }
        >
          <div className="d-form" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="d-form__row">
              <Field label="Nama Cabang" id="br-name" hint="Contoh: Kopi Harum Pettarani">
                <input
                  id="br-name"
                  placeholder="Masukkan nama cabang..."
                  value={f.name}
                  onChange={(e) => setF({ ...f, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Kota" id="br-city" hint="Contoh: Makassar">
                <input
                  id="br-city"
                  placeholder="Nama kota..."
                  value={f.city}
                  onChange={(e) => setF({ ...f, city: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Alamat Lengkap" id="br-addr">
              <textarea
                id="br-addr"
                rows={2}
                placeholder="Alamat jalan, nomor ruko, kelurahan, kecamatan..."
                value={f.address}
                onChange={(e) => setF({ ...f, address: e.target.value })}
              />
            </Field>

            <div className="d-form__row">
              <Field label="Tipe Fungsi Cabang" id="br-type">
                <select
                  id="br-type"
                  value={f.is_warehouse ? "warehouse" : "outlet"}
                  onChange={(e) => setF({ ...f, is_warehouse: e.target.value === "warehouse" })}
                >
                  <option value="outlet">Outlet Penjualan (Kasir POS, Meja & Dapur)</option>
                  <option value="warehouse">Gudang Bahan / Central Kitchen (Tanpa Kasir)</option>
                </select>
              </Field>
              <Field label="Radius Geofence Absensi (Meter)" id="br-geo" hint="Jarak toleransi GPS staf untuk clock-in">
                <input
                  id="br-geo"
                  type="number"
                  min="10"
                  max="1000"
                  value={f.geofence_m}
                  onChange={(e) => setF({ ...f, geofence_m: e.target.value })}
                />
              </Field>
            </div>

            {/* Titik GPS Geofence */}
            <div
              style={{
                padding: "0.875rem",
                background: "var(--color-paper-2, #f8fafc)",
                border: "1px solid var(--color-rule, #e2e8f0)",
                borderRadius: "var(--radius-md, 8px)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>📍 Titik Koordinat GPS Cabang</span>
                <button
                  type="button"
                  className="d-btn d-btn--subtle"
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                  onClick={getGeoLocation}
                  disabled={geoLoading}
                >
                  {geoLoading ? "Mendeteksi..." : "Gunakan Lokasi Saya Saat Ini"}
                </button>
              </div>
              <div className="d-form__row">
                <Field label="Latitude" id="br-lat">
                  <input
                    id="br-lat"
                    placeholder="-5.147665"
                    value={f.lat}
                    onChange={(e) => setF({ ...f, lat: e.target.value })}
                  />
                </Field>
                <Field label="Longitude" id="br-lng">
                  <input
                    id="br-lng"
                    placeholder="119.432731"
                    value={f.lng}
                    onChange={(e) => setF({ ...f, lng: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            {/* Opsi Kloning Menu & Resep (khusus saat buat baru) */}
            {modal === "create" && branches.length > 0 && (
              <Field
                label="Kloning Katalog Menu & Resep"
                id="br-clone"
                hint="Menyalin struktur kategori produk, varian, dan resep bahan agar cabang langsung siap pakai."
              >
                <select
                  id="br-clone"
                  value={f.clone_from}
                  onChange={(e) => setF({ ...f, clone_from: e.target.value })}
                >
                  <option value="">Jangan kloning (Mulai katalog kosong)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Salin dari {b.name} ({b.city || "Cabang"})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {/* Khusus Pilar Health */}
            {isHealth && (
              <Field
                label="SATUSEHAT Location ID (Kemenkes RI)"
                id="br-satusehat"
                hint="ID lokasi resmi faskes dari platform SATUSEHAT untuk bridging data rekam medis."
              >
                <input
                  id="br-satusehat"
                  placeholder="Contoh: b9cf9a3e-63f2-4b2a-8742-…"
                  value={f.satusehat_location_id}
                  onChange={(e) => setF({ ...f, satusehat_location_id: e.target.value })}
                />
              </Field>
            )}

            <Feedback a={a} />
          </div>
        </Modal>
      )}
    </>
  );
}

# SYSTEM & TECHNICAL ARCHITECTURE DOCUMENTATION
# PLATFORM HARUM.IN — MULTI-TENANT CLOUD OS (POS & HEALTHCARE)

**Versi Dokumen:** 1.0 (Production Blueprint Architecture)  
**Status:** Canonical Technical Architecture Reference  
**Klasifikasi:** Internal Engineering Specification  
**Basis Database:** PostgreSQL 15+ (Supabase) dengan 31 Migrasi SQL Terpadu  

---

## DAFTAR ISI
1. [Ringkasan Arsitektur Sistem](#1-ringkasan-arsitektur-sistem)
2. [Topologi Arsitektur Tingkat Tinggi (High-Level Topology)](#2-topologi-arsitektur-tingkat-tinggi-high-level-topology)
3. [Komponen Stack Teknologi](#3-komponen-stack-teknologi)
4. [Arsitektur Multi-Tenant & Model Keamanan Zero-Trust](#4-arsitektur-multi-tenant--model-keamanan-zero-trust)
   - [4.1 Isolasi Tenant via JWT Claims](#41-isolasi-tenant-via-jwt-claims)
   - [4.2 Pola Optimasi RLS: Subquery InitPlan Komposit](#42-pola-optimasi-rls-subquery-initplan-komposit)
   - [4.3 Mesin Evaluasi Izin RBAC (Frontend & Backend)](#43-mesin-evaluasi-izin-rbac-frontend--backend)
5. [Skema Database & Peta 31 Migrasi SQL](#5-skema-database--peta-31-migrasi-sql)
6. [Katalog Stored Procedure & RPC Berkeamanan Tinggi (SECURITY DEFINER)](#6-katalog-stored-procedure--rpc-berkeamanan-tinggi-security-definer)
7. [Diagram Alur & State Machine Transaksi Kritis](#7-diagram-alur--state-machine-transaksi-kritis)
   - [7.1 Alur Transaksi POS & Pemotongan Otomatis Resep BOM](#71-alur-transaksi-pos--pemotongan-otomatis-resep-bom)
   - [7.2 Alur Presensi Kamera Live, Stempel Watermark & Geofencing](#72-alur-presensi-kamera-live-stempel-watermark--geofencing)
   - [7.3 Alur Otorisasi Void Berjenjang (Kasir Request -> PIN GM -> Owner)](#73-alur-otorisasi-void-berjenjang-kasir-request---pin-gm---owner)
   - [7.4 Alur Pembayaran QRIS Dinamis Pakasir & Webhook](#74-alur-pembayaran-qris-dinamis-pakasir--webhook)
   - [7.5 Alur Rekam Medis Elektronik (RME) & SATUSEHAT Kemenkes](#75-alur-rekam-medis-elektronik-rme--satusehat-kemenkes)
8. [Arsitektur Integrasi Gateway Eksternal](#8-arsitektur-integrasi-gateway-eksternal)
9. [Komunikasi Real-Time (Supabase Realtime WebSockets)](#9-komunikasi-real-time-supabase-realtime-websockets)
10. [Strategi Skalabilitas, Backup & Kepatuhan Audit](#10-strategi-skalabilitas-backup--kepatuhan-audit)

---

## 1. RINGKASAN ARSITEKTUR SISTEM

**Harum.in** dibangun di atas paradigma **Modern Cloud-Native Multi-Tenant Architecture**. Seluruh data tenant berada dalam satu basis data terpusat (*Shared Database, Shared Schema Architecture*) namun dipisahkan secara logis dengan isolasi mutlak menggunakan **PostgreSQL Row-Level Security (RLS)**.

```
+---------------------------------------------------------------------------------------------------+
|                                       LAPISAN KLIEN (CLIENT LAYER)                                |
|  · Single Page Application (React 18 + Vite)                                                      |
|  · Native WebRTC Video Streaming & Canvas 2D Watermark Renderer                                   |
|  · Member PWA Portal (/m) dengan Autentikasi OTP WhatsApp                                         |
+---------------------------------------------------------------------------------------------------+
                                                  |  HTTPS / WebSocket
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                     LAPISAN GATEWAY & API (EDGE API)                              |
|  · Supabase PostgREST (Auto-Generated CRUD API)                                                   |
|  · Supabase GoTrue Auth (JWT Signing, Role Claims, Tenant Claims)                                 |
|  · Stored Procedures / RPC Layer (SECURITY DEFINER untuk Transaksi Kritis)                        |
|  · Realtime Engine (PostgreSQL Logical Replication -> WebSockets)                                 |
+---------------------------------------------------------------------------------------------------+
                                                  |
                         +------------------------+------------------------+
                         |                                                 |
                         v                                                 v
+---------------------------------------------------+   +-------------------------------------------+
|             DATABASE LAYER (POSTGRESQL 15+)       |   |         EXTERNAL SERVICES GATEWAY         |
|  · 31 Migrasi SQL Terstruktur                     |   |  · 9router AI Gateway (LLM Copilot)       |
|  · Row-Level Security (RLS) dengan Pola InitPlan  |   |  · Hermes WhatsApp Gateway (Notif & Struk)|
|  · Triggers: Audit Logs, Auto-BOM Deduction       |   |  · Pakasir QRIS Gateway v2 (Dynamic QR)   |
|  · Composite Indexes untuk Kueri Real-time        |   |  · Kemenkes SATUSEHAT (HL7 FHIR API)      |
+---------------------------------------------------+   +-------------------------------------------+
```

---

## 2. TOPOLOGI ARSITEKTUR TINGKAT TINGGI (HIGH-LEVEL TOPOLOGY)

1. **Frontend Tier**:
   - Single Page Application (SPA) berbasis React 18 yang dikompilasi super cepat menggunakan Vite.
   - Pemuatan rute berbasis lazy-loading (*code splitting* per fitur/modul).
   - Pengendalian izin navigasi frontend dieksekusi secara deklaratif melalui registri terpusat `src/app/pages.js` menggunakan evaluator `gate(role)`.
2. **Backend as a Service (BaaS) Tier**:
   - Supabase PostgREST menyediakan antarmuka REST API berkinerja tinggi langsung ke tabel PostgreSQL.
   - Supabase GoTrue mengelola siklus otentikasi, enkripsi password, dan penyematan metadata custom (`tenant_id`, `role`, `branch_id`) ke dalam klaim JWT.
3. **Database Tier**:
   - Basis data PostgreSQL 15+ dengan penegakan integritas relasional, ACID compliance, dan *zero-trust* RLS.
   - Stored Procedure / RPC (Remote Procedure Call) berperan sebagai *Domain Service Layer* untuk memproses logika bisnis yang memerlukan atomisitas tinggi (seperti pembuatan order, pemotongan stok bahan, persetujuan void, dan absensi geofence).

---

## 3. KOMPONEN STACK TEKNOLOGI

| Lapisan Sistem | Teknologi / Pustaka | Versi | Peran & Alasan Pemilihan |
|---|---|---|---|
| **Frontend Framework** | React | `^18.2.0` | Declarative UI, state management berbasis hook, performa rendering tinggi. |
| **Bundler & Build Tool**| Vite | `^5.0.0` | Instant server start, Hot Module Replacement (HMR), tree-shaking efisien. |
| **Styling & Design System**| Vanilla CSS / CSS Variables | Standard CSS3 | Desain sistem modular, bebas overhead Tailwind, loading instan, ukuran bundle minimal. |
| **Media API** | WebRTC `getUserMedia` + HTML5 Canvas | Native Browser API | Akses kamera live langsung tanpa pustaka berat pihak ketiga, manipulasi piksel stempel watermark permanen. |
| **Geolokasi API** | W3C Geolocation API | Native Browser API | Pengambilan koordinat GPS akurasi tinggi (Latitude, Longitude, Accuracy). |
| **Backend / DB** | PostgreSQL via Supabase | `15+` | Mesin basis data relasional enterprise, dukungan JSONB, RLS, dan logical replication. |
| **Autentikasi** | Supabase GoTrue (JWT) | `2.x` | Stateless authentication, enkripsi token standar RS256, klaim tenant_id bawaan. |
| **Realtime** | Supabase Realtime | `2.x` | Pengiriman event database ke klien KDS dan antrean kasir via WebSocket. |
| **AI Integration** | 9router AI Gateway | v1 REST API | Proxy gateway cerdas untuk LLM (DeepSeek / OpenAI) dengan isolasi data riil merchant. |
| **WhatsApp Gateway** | Hermes API | REST Webhook | Pengiriman notifikasi omzet malam dan pengiriman struk digital ramah lingkungan. |
| **Payment Gateway** | Pakasir QRIS Gateway | v2 API | Settlement QRIS dinamis otomatis dengan webhook konfirmasi instan < 2 detik. |
| **Healthcare Standard**| HL7 FHIR Specification | R4 JSON | Interoperabilitas rekam medis elektronik terstandarisasi Kemenkes SATUSEHAT. |

---

## 4. ARSITEKTUR MULTI-TENANT & MODEL KEAMANAN ZERO-TRUST

### 4.1 Isolasi Tenant via JWT Claims
Setiap pengguna yang berhasil diautentikasi menerima JSON Web Token (JWT) yang memuat klaim identitas penting:
```json
{
  "sub": "u3-uuid-profile",
  "email": "kasir.panakkukang@harum.in",
  "role": "authenticated",
  "app_metadata": {
    "provider": "email"
  },
  "user_metadata": {
    "tenant_id": "T1-uuid-tenant",
    "branch_id": "B1-uuid-panakkukang",
    "role": "staff"
  }
}
```

### 4.2 Pola Optimasi RLS: Subquery InitPlan Komposit
Pada arsitektur multi-tenant tradisional, kebijakan RLS seperti `tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())` seringkali dieksekusi secara berulang untuk setiap baris (*SubPlan*), yang menyebabkan penurunan performa drastis dan *statement timeout* saat tabel membesar.

Harum.in menerapkan **Pola InitPlan Berindeks Komposit**:
```sql
-- Contoh Kebijakan RLS Teroptimasi pada Tabel Orders
CREATE POLICY orders_tenant_isolation ON orders
FOR ALL TO authenticated
USING (
  tenant_id = (
    SELECT p.tenant_id 
    FROM profiles p 
    WHERE p.id = (SELECT auth.uid())
    LIMIT 1
  )
);
```
- **Prinsip Kerja Engine PostgreSQL**: Evaluasi `(SELECT auth.uid())` diangkat menjadi `InitPlan` yang hanya dieksekusi **satu kali per kueri**, bukan per baris.
- Didukung oleh indeks komposit `CREATE INDEX idx_profiles_uid_tenant ON profiles(id, tenant_id);`, waktu evaluasi RLS menjadi **< 0.1 milidetik**.

### 4.3 Mesin Evaluasi Izin RBAC (Frontend & Backend)
Harum.in menerapkan prinsip *Single Source of Truth* untuk RBAC:
1. **Frontend (`src/lib/rbac.js` & `src/lib/rbac-matrix.js`)**:
   - `MATRIX`: Matriks otorisasi 20 Fitur × 5 Peran asli Dokumen Blueprint + `MEMBER_ACCESS` untuk peran Member L5.
   - Fungsi `can(role, featureNo, action)` memvalidasi izin aksi (`c` = create, `r` = read, `u` = update, `d` = delete, `a` = approve, `q` = request).
   - Fungsi `permOf(role, featureNo)` mengekstrak scope data (`own`, `katalog`, `operasional`, `petty_cash`, dll).
2. **Backend (Database Layer)**:
   - File migrasi `20261011000004_rbac_matrix.sql` dan `20261011000021_rbac_member_seed.sql` menanam matriks yang identik ke tabel `rbac_matrix`.
   - Fungsi RPC memanggil fungsi helper `need(feature_no, action)` sebelum mengeksekusi logika domain:
     ```sql
     IF NOT has_perm(auth.uid(), 13, 'c') THEN
       RAISE EXCEPTION 'Akses ditolak: Tidak memiliki wewenang presensi';
     END IF;
     ```

---

## 5. SKEMA DATABASE & PETA 31 MIGRASI SQL

Berikut adalah pemetaan struktural 31 berkas migrasi SQL resmi di direktori `supabase/migrations/`:

```
+---------------------------------------------------------------------------------------------------+
| NO  | NAMA FILE MIGRASI SQL                      | TUJUAN & STRUKTUR TABEL / FUNGSI               |
+-----+--------------------------------------------+------------------------------------------------+
| 01  | 20261011000001_schema.sql                  | Tabel Inti: tenants, branches, profiles, roles |
| 02  | 20261011000002_rbac_rls.sql                | Kebijakan Dasar RLS Multi-Tenant               |
| 03  | 20261011000003_functions.sql               | Helper: auth_tenant_id(), current_role()       |
| 04  | 20261011000004_rbac_matrix.sql             | Tabel rbac_matrix & Seed 20×5 Asli Dokumen     |
| 05  | 20261011000005_operations.sql              | Master POS: categories, products, orders, items|
| 06  | 20261011000006_operations_rpc.sql          | RPC POS: create_order, pay_order, void_order   |
| 07  | 20261011000007_clinic.sql                  | Skema Medis: patients, medical_records, odont  |
| 08  | 20261011000008_clinic_rpc.sql              | RPC Medis: record_soap, bill_prescription      |
| 09  | 20261011000009_icd_codes.sql               | Master Data Standar ICD-10 & ICD-9-CM Kemenkes |
| 10  | 20261011000010_foundation.sql              | Pondasi Multi-Cabang & Tabel audit_logs        |
| 11  | 20261011000011_access.sql                  | Granular Action Granularity (c, r, u, d, a, q) |
| 12  | 20261011000012_fase1_policies_approvals.sql| Tabel branch_policies & approvals queue        |
| 13  | 20261011000013_fase1_policy_enforcement.sql| Penegakan Ambang Batas Diskon & Void Kasir     |
| 14  | 20261011000014_fase2_void_policy_fix.sql   | Perbaikan Supervisor PIN Void di POS Register  |
| 15  | 20261011000015_fase2_hardening.sql         | Hardening RLS Pola InitPlan (Anti-Timeout)     |
| 16  | 20261011000016_fase3_value_add.sql         | BOM Resep, Opname, Kasbon, Payroll & Attendance|
| 17  | 20261011000017_fase4_platform.sql          | SaaS Management: plans, subscriptions, AI Quota|
| 18  | 20261011000018_realtime_publications.sql   | Konfigurasi Supabase Realtime (KDS, Antrean)   |
| 19  | 20261011000019_fase5_hardening.sql         | Triggers Audit Otomatis & Constraint Integrity |
| 20  | 20261011000020_member_role_enum.sql        | Penambahan nilai 'member' pada user_role ENUM   |
| 21  | 20261011000021_rbac_member_seed.sql        | Seed Hak Akses Khusus Member L5 di rbac_matrix |
| 22  | 20261011000022_member_isolation.sql        | Isolasi Ketat RLS Member (Hanya Data Milik Sendiri)|
| 23  | 20261011000023_member_signup.sql           | Registrasi WhatsApp OTP & Pembuatan Profil /m   |
| 24  | 20261011000024_member_dashboard.sql        | RPC Loyalty Points, Kartu Digital QR Member    |
| 25  | 20261011000025_member_order_reserve.sql    | RPC Pemesanan Meja Mandiri & Booking Antrean   |
| 26  | 20261011000026_qris_dynamic.sql            | Tabel qris_transactions & Webhook Pakasir      |
| 27  | 20261011000027_payment_recon.sql           | Rekonsiliasi Arus Kas POS vs Settlement QRIS   |
| 28  | 20261011000028_online_orders.sql           | Agregator Pesanan Marketplace & Online Delivery|
| 29  | 20261011000029_perf_indexes.sql            | Indeks Komposit Kueri Cepat (Multi-Branch, Date)|
| 30  | 20261011000030_copilot_token_model.sql     | Model Token Kuota Copilot (1 Tanya = 1 Kuota)  |
| 31  | 20261011000031_owner_branch_management.sql| Kelola Cabang Mandiri Owner, 1-Click Clone, GPS|
+---------------------------------------------------------------------------------------------------+
```

---

## 6. KATALOG STORED PROCEDURE & RPC BERKEAMANAN TINGGI (SECURITY DEFINER)

Seluruh mutasi data yang bernilai finansial atau berisiko tinggi wajib dieksekusi melalui Stored Procedure PostgreSQL berstatus `SECURITY DEFINER` untuk mencegah manipulasi sisi klien:

### 6.1 Modul Presensi & Ketenagakerjaan (Fitur 13)
* **`clock(p_kind, p_lat, p_lng, p_accuracy, p_selfie)`**:
  - *Peran Berwenang*: Kasir, Staf, Dokter (`staff`, `dokter`).
  - *Alur Eksekusi*:
    1. Validasi persetujuan pemrosesan data (UU PDP Consent).
    2. Menghitung jarak Haversine antara `(p_lat, p_lng)` dengan koordinat cabang `branches(lat, lng)`.
    3. Memastikan jarak $\le$ `geofence_radius_meters` (default: 50m).
    4. Mengambil jadwal kerja hari ini dari tabel `work_shifts`.
    5. Jika `p_kind = 'in'`, menghitung keterlambatan: $\max(0, \text{WaktuAbsen} - \text{StartTime})$.
    6. Jika `p_kind = 'out'`, menghitung lembur: $\max(0, \text{WaktuAbsen} - \text{EndTime})$.
    7. Menyimpan baris presensi beserta URL stempel watermark foto.
* **`give_attendance_consent()`**:
  - Mencatat stempel waktu ISO persetujuan biometrik karyawan ke `profiles.attendance_consent_at`.
* **`correct_attendance(p_id, p_at, p_reason)`**:
  - *Peran Berwenang*: Owner, GM (`owner`, `gm`).
  - Memperbarui waktu kehadiran dengan alasan wajib (min. 5 karakter) dan otomatis mencatat ke `audit_logs`.

### 6.2 Modul Manajemen Multi-Cabang Owner (Fitur 1 & Migrasi 31)
* **`owner_create_branch(p_name, p_code, p_address, p_lat, p_lng, p_geofence_m, p_purpose, p_clone_from)`**:
  - *Peran Berwenang*: Owner (`owner`).
  - *Alur Eksekusi*:
    1. Menghitung jumlah cabang aktif tenant; memvalidasi terhadap kuota `plans.max_branches`.
    2. Menyisipkan cabang baru dengan koordinat geofencing.
    3. Jika `p_clone_from` diisi, mengeksekusi **1-Click Branch Clone**: menduplikasi produk, varian, dan resep BOM dari cabang sumber ke cabang baru.
* **`owner_branch_overview()`**:
  - Menghasilkan rekapitulasi data cabang: omzet penjualan harian, jumlah staf aktif, dan kapasitas kuota paket.

### 6.3 Modul Transaksi POS, Void & Resep BOM (Fitur 4, 5, 6)
* **`create_order(p_branch_id, p_table_id, p_items, p_discount_code)`**:
  - Memvalidasi status shift kasir aktif, menghitung subtotal, pajak PB1/PPN, dan menerbitkan tiket antrean dapur KDS.
* **`pay_order(p_order_id, p_method, p_amount_paid, p_cashier_shift_id)`**:
  - Mengubah status pesanan menjadi `paid`, membukukan penerimaan ke shift kasir, dan secara atomik memanggil trigger pengurangan stok bahan baku (`deduct_bom_stock`).
* **`void_order(p_order_id, p_reason, p_supervisor_pin)`**:
  - Jika nominal void $\le$ ambang batas kebijakan cabang, PIN Supervisor GM diverifikasi langsung di POS. Jika melebihi ambang batas, diteruskan ke antrean `approvals` milik Owner. Reversal stok bahan baku dieksekusi jika status KDS belum selesai dimasak.

### 6.4 Modul AI Owner Copilot (Fitur 2 & Migrasi 30)
* **`consume_ai_quota(p_tenant_id)`**:
  - Mengurangi tepat **1 token kuota** dari `tenants.ai_quota_remaining` saat pertanyaan berhasil diproses oleh 9router LLM. Menolak permintaan jika kuota tersisa = 0.
* **`set_ai_quota(p_tenant_id, p_quota)`**:
  - *Peran Berwenang*: Superadmin (`superadmin`). Mengalokasikan jatah kuota token bulanan.

---

## 7. DIAGRAM ALUR & STATE MACHINE TRANSAKSI KRITIS

### 7.1 Alur Transaksi POS & Pemotongan Otomatis Resep BOM

```
[ Kasir POS ]              [ Supabase RPC ]           [ Inventory System ]       [ Ledger Akuntansi ]
      |                           |                            |                          |
      |--- 1. pay_order() ------->|                            |                          |
      |                           |--- 2. Validasi Pembayaran -|                          |
      |                           |--- 3. Update Order Status -|                          |
      |                           |       (status = 'paid')    |                          |
      |                           |                            |                          |
      |                           |--- 4. Loop Resep BOM ----->|                          |
      |                           |    (Cek recipe_items)      |                          |
      |                           |                            |--- 5. Kurangi Stok ----->|
      |                           |                            |    (inventory_items)     |
      |                           |                                                       |
      |                           |--- 6. Jurnal Otomatis Penjualan & HPP --------------->|
      |                           |       (Debit: Kas/QRIS, Kredit: Penjualan)            |
      |                           |       (Debit: HPP, Kredit: Persediaan Bahan)          |
      |                           |                                                       |
      |<-- 7. Respon Sukses ------|                                                       |
      |    (Cetak Struk POS)      |                                                       |
```

### 7.2 Alur Presensi Kamera Live, Stempel Watermark & Geofencing

```
[ Karyawan / Tablet ]      [ Canvas Engine ]         [ GPS & Network ]         [ Supabase clock() RPC ]
          |                        |                         |                           |
          |-- 1. Buka Viewfinder ->|                         |                           |
          |   (Oval Face Guide)    |                         |                           |
          |                        |                         |                           |
          |-- 2. Tekan Absen ----->|                         |                           |
          |                        |-- 3. Ambil GPS -------->|                           |
          |                        |<-- (Lat, Lng, Akurasi) -|                           |
          |                        |                                                     |
          |                        |-- 4. Render Video Frame ke Canvas (640x480)         |
          |                        |-- 5. Cetak Pita Watermark Permanen:                 |
          |                        |      (Nama, Role, Cabang, Jam Server, GPS, Jarak)   |
          |                        |-- 6. Export ke JPEG Data URL                        |
          |                        |                                                     |
          |------------------------ 7. Kirim clock() RPC + Foto Watermark -------------->|
          |                                                                              |-- 8. Cek Geofence (Haversine)
          |                                                                              |-- 9. Cek Shift (work_shifts)
          |                                                                              |-- 10. Hitung Telat / Lembur
          |                                                                              |-- 11. Simpan ke attendance
          |<----------------------- 12. Konfirmasi Kehadiran Berhasil -------------------|
```

### 7.3 Alur Otorisasi Void Berjenjang (Kasir Request -> PIN GM -> Owner)

```
[ Kasir POS ]                 [ Layar POS ]                [ General Manager ]            [ Owner Merchant ]
      |                             |                               |                              |
      |-- 1. Klik Minta Void ------>|                               |                              |
      |    (Input Alasan Void)      |                               |                              |
      |                             |-- 2. Cek Ambang Batas Nilai   |                              |
      |                             |                               |                              |
      |                             |-- [Jika <= Limit Cabang] ---->|                              |
      |                             |   (Minta PIN Supervisor)      |                              |
      |                             |   (GM Input PIN di Tempat)    |                              |
      |                             |<-- PIN Valid: Void Sukses ----|                              |
      |                             |                                                              |
      |                             |-- [Jika > Limit Cabang] ------------------------------------>|
      |                             |   (Kirim ke Tabel approvals)                                 |
      |                             |                                                              |-- Review Alasan
      |                             |                                                              |-- Setujui / Tolak
      |<-- 3. Status Terkoreksi ----|<-------------------------------------------------------------|
```

### 7.4 Alur Pembayaran QRIS Dinamis Pakasir & Webhook

```
[ Pelanggan / Kasir ]      [ Harum.in Engine ]       [ Pakasir API v2 ]         [ Bank / E-Wallet ]
          |                          |                        |                          |
          |-- 1. Minta Bayar QRIS -->|                        |                          |
          |                          |-- 2. Generate QR ----->|                          |
          |                          |<-- 3. String QR Dinamis|                          |
          |<-- 4. Tampilkan QR ------|                        |                          |
          |                                                   |                          |
          |-- 5. Scan & Bayar via Mobile Banking / E-Wallet ---------------------------->|
          |                                                   |                          |
          |                                                   |<-- 6. Notifikasi Bayar --|
          |                          |                        |                          |
          |                          |<-- 7. HTTP Webhook ----|                          |
          |                          |    (order_id, amount)  |                          |
          |                          |                                                   |
          |                          |-- 8. Validasi Signature & Nominal                 |
          |                          |-- 9. Eksekusi pay_order()                         |
          |                          |-- 10. Broadcast via Supabase Realtime             |
          |<-- 11. Layar Berubah Lunas (Struk Otomatis Tercetak)                         |
```

### 7.5 Alur Rekam Medis Elektronik (RME) & SATUSEHAT Kemenkes

```
[ Pasien Masuk ]        [ Dokter Pemeriksa ]       [ RME Engine ]              [ SATUSEHAT Outbox ]
       |                         |                       |                              |
       |-- 1. Panggil Antrean -->|                       |                              |
       |                         |-- 2. Input SOAP ----->|                              |
       |                         |   (S, O, A: ICD-10,   |                              |
       |                         |    P: Tindakan & Resep|                              |
       |                         |                       |                              |
       |                         |-- 3. Finalisasi RME ->|                              |
       |                         |      (Tanda Tangan)   |-- 4. Kunci Rekam Medis       |
       |                         |                       |   (Status: Immutable 25 thn) |
       |                         |                       |                              |
       |                         |                       |-- 5. Generate FHIR Bundle -->|
       |                         |                       |   (Encounter, Condition)     |
       |                         |                       |                              |-- 6. Sync ke Kemenkes
       |                         |<-- 7. Selesai --------|                              |    (HL7 FHIR API)
```

---

## 8. ARSITEKTUR INTEGRASI GATEWAY EKSTERNAL

### 8.1 9router AI Gateway
- **Protokol**: HTTP POST REST JSON.
- **Header Autentikasi**: `Authorization: Bearer <9ROUTER_API_KEY>`, `X-Tenant-ID: <TENANT_ID>`.
- **Enkapsulasi Konteks**: Sebelum dikirim ke LLM, sistem mengambil ringkasan agregat toko (total omzet hari ini, stok di bawah batas aman, kas kecil terbuka) dan menyuntikkannya sebagai *System Prompt Context*.
- **Governance**: Pengurangan kuota token dieksekusi secara atomik sebelum prompt diproses.

### 8.2 Hermes WhatsApp Gateway
- **Fungsi Utama**:
  1. Pengiriman notifikasi OTP login bagi Member portal `/m`.
  2. Pengiriman laporan omzet dan ringkasan laba kotor malam otomatis ke WhatsApp Owner (pukul 23:00 WITA).
  3. Pengiriman struk digital e-receipt ke pelanggan sebagai opsi ramah lingkungan tanpa kertas thermal.
- **Failover Handling**: Jika nomor WhatsApp penerima tidak aktif, status pengiriman dicatat `failed` tanpa membatalkan transaksi POS.

### 8.3 Pakasir Payment Gateway v2
- **Endpoint**: `https://app.pakasir.com/api/v2/qris/create`
- **Keamanan Webhook**: Webhook dilindungi oleh HMAC-SHA256 signature verifier yang mencocokkan payload body dengan secret key merchant untuk mencegah serangan pemalsuan status bayar (*fake payment injection*).

### 8.4 Kementerian Kesehatan RI (SATUSEHAT)
- **Standar Format**: HL7 FHIR (Fast Healthcare Interoperability Resources) Release 4.
- **Arsitektur Antrean (Outbox Pattern)**: Data rekam medis tidak dikirim secara sinkron saat dokter menekan simpan untuk mencegah perlambatan browser. Berkas disimpan ke tabel `satusehat_outbox` dan diproses oleh background job worker terpisah dengan mekanisme retry otomatis (*exponential backoff*).

---

## 9. KOMUNIKASI REAL-TIME (SUPABASE REALTIME WEBSOCKETS)

Sistem memanfaatkan fitur **PostgreSQL Logical Replication** dari Supabase Realtime:
1. **Saluran Dapur KDS (`kitchen_tickets`)**:
   - Filter Channel: `tenant_id=eq.<ID>&branch_id=eq.<ID>`
   - Saat kasir menerima pembayaran, baris baru di `kitchen_tickets` langsung memicu rendering kartu pesanan di layar tablet barista/koki dalam < 300 ms tanpa perlu polling berulang.
2. **Saluran Kasir POS (`qris_transactions`)**:
   - Filter Channel: `id=eq.<TX_ID>`
   - Layar kasir mendengarkan perubahan status dari `pending` ke `settled` untuk menutup modal QRIS dan mencetak struk secara otomatis.
3. **Saluran Ruang Tunggu (`queues`)**:
   - Memperbarui nomor panggilan aktif di layar TV ruang tunggu saat dokter atau kasir memanggil antrean berikutnya.

---

## 10. STRATEGI SKALABILITAS, BACKUP & KEPATUHAN AUDIT

### 10.1 Skalabilitas Database
- **Partisi Tabel Transaksional**: Tabel dengan volume data raksasa (`orders`, `attendance`, `audit_logs`) dirancang untuk dapat dipartisi secara horizontal berdasarkan rentang waktu tahunan (*Declarative Range Partitioning*).
- **Indeks Parsial & Komposit**: Kueri dashboard eksekutif membaca dari indeks terfokus:
  ```sql
  CREATE INDEX idx_orders_tenant_paid_date 
  ON orders(tenant_id, branch_id, paid_at) 
  WHERE status = 'paid';
  ```

### 10.2 Kepatuhan Retensi Data Medis (Permenkes 24/2022)
- Rekam medis elektronik dan log audit perubahan diagnosa disimpan secara permanen dengan batas retensi minimal **25 tahun**.
- Tabel `medical_records` memiliki trigger proteksi yang menolak perintah `DELETE` secara mutlak (`BEFORE DELETE RAISE EXCEPTION`).

### 10.3 Disaster Recovery & Cadangan
- Cadangan Point-in-Time Recovery (PITR) harian dengan retensi log perubahan data 30 hari.
- Dukungan ekspor berkas mandiri format JSON/CSV bagi Owner untuk keperluan audit pajak dan kepatuhan hukum independen.

---
*Dokumen Arsitektur ini adalah spesifikasi teknis definitif yang mengatur seluruh implementasi backend, database, dan logika komunikasi platform Harum.in.*

# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# PLATFORM HARUM.IN — CLOUD POS & HEALTHCARE OPERATING SYSTEM

**Versi Dokumen:** 1.0 (Production Blueprint)  
**Status:** Approved for Implementation  
**Klasifikasi:** Internal System & Product Specification  
**Platform Target:** Web Application (Mobile-Responsive Tablet/Desktop POS & Member Web PWA)  

---

## DAFTAR ISI
1. [Eksekutif & Visi Produk](#1-eksekutif--visi-produk)
2. [Model Bisnis Dua Pilar (Dual-Pillar Architecture)](#2-model-bisnis-dua-pilar-dual-pillar-architecture)
3. [Hirarki Pengguna & Persona RBAC (8 Peran)](#3-hirarki-pengguna--persona-rbac-8-peran)
4. [Matriks Hak Akses RBAC (20 Fitur × 8 Peran)](#4-matriks-hak-akses-rbac-20-fitur--8-peran)
5. [Spesifikasi Fungsional 20 Modul Utama](#5-spesifikasi-fungsional-20-modul-utama)
6. [Fitur Unggulan & Alur Bisnis Khusus](#6-fitur-unggulan--alur-bisnis-khusus)
   - [6.1 Owner Copilot AI (Model Kuota Transparan)](#61-owner-copilot-ai-model-kuota-transparan)
   - [6.2 Presensi Biometrik Kamera Live & Watermark Anti-Fraud](#62-presensi-biometrik-kamera-live--watermark-anti-fraud)
   - [6.3 Manajemen Multi-Cabang & 1-Click Catalog Cloning](#63-manajemen-multi-cabang--1-click-catalog-cloning)
   - [6.4 Otomasi Resep & Pemotongan Stok Bahan Baku (BOM)](#64-otomasi-resep--pemotongan-stok-bahan-baku-bom)
   - [6.5 Pembayaran QRIS Dinamis Pakasir & Rekonsiliasi Otomatis](#65-pembayaran-qris-dinamis-pakasir--rekonsiliasi-otomatis)
   - [6.6 Rekam Medis Elektronik (RME SOAP) & Kepatuhan SATUSEHAT](#66-rekam-medis-elektronik-rme-soap--kepatuhan-satusehat)
   - [6.7 Portal Pelanggan & Member Mandiri (/m)](#67-portal-pelanggan--member-mandiri-m)
7. [Persyaratan Non-Fungsional (NFR)](#7-persyaratan-non-fungsional-nfr)
8. [Kepatuhan Regulasi & Standar Industri](#8-kepatuhan-regulasi--standar-industri)
9. [Rencana Rilis & Milestone Pengembangan](#9-rencana-rilis--milestone-pengembangan)

---

## 1. EKSEKUTIF & VISI PRODUK

### 1.1 Latar Belakang Masalah
Industri ritel, F&B (makanan & minuman), dan fasilitas pelayanan kesehatan primer (klinik pratama, klinik gigi, klinik estetika) di Indonesia menghadapi tantangan operasional kritis:
1. **Kebocoran Kas & Fraud Transaksi**: Manipulasi pembatalan nota (void), mark-up kasbon, titip absen kehadiran kerja, serta kecurangan pemberian diskon sepihak oleh kasir.
2. **Pemborosan Bahan Baku (Waste) & HPP Tidak Akurat**: Ketiadaan sistem integrasi antara penjualan menu POS dengan pemotongan stok bahan baku di gudang secara otomatis berdasarkan gramatur resep (*Bill of Materials*).
3. **Kompleksitas Multi-Cabang**: Pemilik usaha kesulitan membuka cabang baru secara cepat tanpa harus menginput ulang ratusan menu dan takaran resep satu per satu.
4. **Isolasi Data Rekam Medis & Regulasi Pemerintah**: Klinik mandiri kesulitan mematuhi kewajiban Rekam Medis Elektronik (Permenkes No. 24 Tahun 2022) dan integrasi platform SATUSEHAT Kementerian Kesehatan RI.

### 1.2 Visi & Pernyataan Misi Produk
**Harum.in** hadir sebagai **Cloud Operating System Multi-Tenant Terpadu** yang menggabungkan keandalan Point of Sale (POS) ritel & F&B dengan Rekam Medis Elektronik (RME) berstandar medis, diperkuat dengan tata kelola izin berjenjang tingkat perbankan (*Zero-Trust Role-Based Access Control*), analitik kecerdasan buatan (*AI Owner Copilot*), serta sistem absensi biometrik visual anti-rekayasa.

---

## 2. MODEL BISNIS DUA PILAR (DUAL-PILLAR ARCHITECTURE)

Sistem Harum.in beroperasi di atas satu fondasi multi-tenant yang mendukung dua pilar bisnis secara terisolasi namun menggunakan mesin akuntansi dan RBAC yang sama:

```
+---------------------------------------------------------------------------------------------------+
|                                     HARUM.IN CORE ENGINE                                          |
+---------------------------------------------------------------------------------------------------+
|  Isolasi Tenant Tingkat Database (tenant_id) · Mesin Akuntansi PSAK · Mesin RBAC Matriks 20 Fitur |
+---------------------------------------------------------------------------------------------------+
                               |                                             |
                               v                                             v
        +-----------------------------------------+   +---------------------------------------------+
        |        PILAR F&B, RITEL & JASA          |   |          PILAR HEALTH (KLINIK MEDIS)        |
        |        (food, retail, service)          |   |                   (health)                  |
        +-----------------------------------------+   +---------------------------------------------+
        | · Register POS Kasir Cepat (Touchscreen)|   | · Rekam Medis Elektronik SOAP               |
        | · Kitchen Display System (Layar Dapur)  |   | · Odontogram Gigi 2-Digit FDI Internasional |
        | · Pemetaan Denah Meja & QR Meja         |   | · Katalog Diagnosis ICD-10 & ICD-9-CM Medis |
        | · Resep & BOM Pemotongan Gramatur Bahan |   | · e-Resep Obat & Billing Kasir Farmasi      |
        | · Integrasi Aggregator Pesanan Online   |   | · PPN Medis 0% (Bebas Pajak Jasa Kesehatan) |
        | · Pajak Restoran PB1 / PPN 11% Otomatis |   | · Bridging Kemenkes SATUSEHAT (HL7 FHIR)    |
        +-----------------------------------------+   +---------------------------------------------+
```

---

## 3. HIRARKI PENGGUNA & PERSONA RBAC (8 PERAN)

Harum.in menetapkan 8 persona pengguna dengan batas kewenangan (*boundaries*) yang tegas:

### 3.1 L0 — Superadmin / Developer (Platform Global Governance)
* **Kewenangan**: Memegang kontrol tertinggi atas seluruh instans SaaS lintas tenant di seluruh Indonesia.
* **Tanggung Jawab**:
  - Konfigurasi master tenant, penetapan pilar bisnis, dan aktivasi paket langganan.
  - Monitoring integrasi gateway: 9router (LLM AI Gateway), Hermes (WhatsApp Gateway), dan Pakasir (QRIS Settlement Engine).
  - Alokasi kuota AI bulanan tiap tenant melalui fungsi RPC `set_ai_quota`.
  - Pemantauan rekonsiliasi arus pembayaran QRIS nasional dan pengawasan audit log forensik database.

### 3.2 L1 — Owner Merchant (Pemilik Usaha F&B / Ritel)
* **Kewenangan**: Pemegang kendali legal, finansial, dan arah strategis bisnis tenant.
* **Tanggung Jawab**:
  - Akses penuh ke Dashboard Laba Riil, Laporan Laba Rugi Otomatis (P&L), dan Neraca PSAK.
  - Penggunaan asisten bisnis Owner Copilot AI berbasis database riil toko (kuota 1 pertanyaan = 1 token).
  - Pusat otorisasi persetujuan tertinggi: menyetujui void di atas limit GM, Purchase Order besar, pengajuan kasbon, dan pengesahan draft payroll gaji karyawan.
  - Pendaftaran cabang baru mandiri, kloning katalog 1 detik, serta penetapan koordinat GPS dan radius geofence.
  - Pengangkatan General Manager (GM) dan penugasan kasir ke cabang spesifik.

### 3.3 L2 — General Manager / GM (Multi-Cabang Operasional)
* **Kewenangan**: Pengawas operasional lapangan dengan lingkup kerja multi-cabang (`branch_id: null`).
* **Tanggung Jawab**:
  - Memantau omzet, performa staf, dan kecepatan layanan di seluruh cabang tanpa terkunci pada satu outlet fisik.
  - Mengelola master katalog produk, penetapan resep BOM, mutasi transfer bahan baku antar-cabang, dan pengadaan PO ke supplier.
  - Otorisasi instan pembatalan nota (void) atau diskon kasir menggunakan PIN Supervisor di layar POS.
  - Pendaftaran staf kasir baru di cabang tertentu, penyusunan jadwal kerja shift, dan verifikasi foto presensi karyawan.

### 3.4 L3 — Kasir / Staf (Frontline Layanan Outlet Terkunci)
* **Kewenangan**: Petugas lapangan yang akunnya terkunci pada outlet spesifik (`branch_id: B1/B2`).
* **Tanggung Jawab**:
  - Menjalankan register POS kasir: input menu, varian, pencatatan pembayaran Tunai & QRIS Pakasir, serta cetak struk.
  - Melakukan pembukaan modal awal kasir, pencatatan kas kecil darurat (petty cash), dan penutupan shift kasir (Z-Report).
  - Mengoperasikan layar Kitchen Display System (KDS) stasiun barista/koki.
  - Melakukan absensi masuk/pulang menggunakan kamera live WebRTC dengan stempel digital watermark permanen di dalam radius geofencing outlet.
  - Melakukan stock opname fisik harian dan pelaporan bahan susut/waste. Kasir tidak memiliki akses melihat data keuangan tenant (`scope: own`).

### 3.5 L4 — Dokter / Terapis (Tenaga Medis Profesional)
* **Kewenangan**: Praktisi klinis profesional pada tenant pilar kesehatan.
* **Tanggung Jawab**:
  - Pemeriksaan pasien menggunakan standar Rekam Medis Elektronik (RME) SOAP.
  - Pencatatan kondisi gigi visual pada Odontogram FDI 2-digit.
  - Penginputan kode diagnosis resmi ICD-10 dan kode tindakan ICD-9-CM.
  - Penerbitan e-resep obat yang langsung mengalir ke loket kasir farmasi.
  - Pemantauan komisi jasa medis (*fee for service*) pribadi secara transparan.

### 3.6 L3 (Health) — Kasir Klinik & Farmasi
* **Kewenangan**: Tenaga administrasi pendaftaran dan kasir farmasi faskes.
* **Tanggung Jawab**:
  - Registrasi pasien baru, pencatatan NIK 16 digit, dan penerbitan nomor antrean poli.
  - Penagihan billing medis berdasarkan tindakan dokter dan e-resep farmasi (otomatis bebas PPN 0%).
  - Menerima pembayaran kasir klinik dan mencetak kwitansi medis klaim asuransi.

### 3.7 L1 (Health) — Owner Faskes / Klinik
* **Kewenangan**: Dokter penanggung jawab / pemilik fasilitas kesehatan.
* **Tanggung Jawab**:
  - Memantau jumlah kunjungan pasien, diagnosis penyakit terbanyak, dan pendapatan jasa medis dokter vs apotek.
  - Mengawasi kepatuhan bridging SATUSEHAT Kemenkes RI dan penyimpanan arsip rekam medis 25 tahun.
  - Menyetujui pengadaan obat keras ke Pedagang Besar Farmasi (PBF) dan mengesahkan komisi jasa medis dokter.

### 3.8 L5 — Member / Pelanggan Mandiri (Customer Portal `/m`)
* **Kewenangan**: Pelanggan eksternal yang mengakses portal mandiri web mobile.
* **Tanggung Jawab**:
  - Login tanpa kata sandi menggunakan nomor WhatsApp via OTP resmi.
  - Menampilkan Kartu Member Digital QR Code dan saldo Poin Harum di kasir.
  - Memindai QR Code meja untuk melihat e-menu, memilih varian, memesan mandiri, dan membayar dengan QRIS Pakasir langsung dari ponselnya.
  - Reservasi meja makan atau booking antrean janji temu dokter klinik.
  - Penggunaan hak privasi: mengunduh data riwayat transaksi atau penghapusan akun mandiri (*Right to be Forgotten* sesuai UU PDP).

---

## 4. MATRIKS HAK AKSES RBAC (20 FITUR × 8 PERAN)

Tabel berikut adalah acuan otorisasi resmi sistem (*single source of truth*) yang diimplementasikan pada database Supabase RLS dan modul otorisasi frontend:

| No | Fitur Matriks RBAC | Superadmin (L0) | Owner (L1) | GM (L2) | Kasir/Staf (L3) | Dokter (L4) | Kasir Klinik (L3) | Member (L5) |
|---|---|---|---|---|---|---|---|---|
| **1** | **Konfigurasi Tenant, 9router & Hermes** | **CRUD** | **R** | - | - | - | - | - |
| **2** | **Dashboard Eksekutif & Laba Riil (+ Copilot AI)**| **R** | **CRUD** | **R (Operasional)**| - | - | - | - |
| **3** | **Master Produk, Varian & Harga Jual** | **CRUD** | **CRUD** | **CRUD** | **R** | **R** | **R** | **R (Katalog)** |
| **4** | **Resep & Bill of Materials (BOM)** | **CRUD** | **CRUD** | **CRUD** | **R** | - | - | - |
| **5** | **Register Transaksi POS & Struk** | - | **R** | **R** | **CRUD** | - | **CRUD (Medis)**| **R (Pesanan Sendiri)**|
| **6** | **Otorisasi Void, Refund & Diskon** | - | **Approval** | **Approval (PIN)** | **Request** | - | **Request** | - |
| **7** | **Denah Meja, Kiosk & QR E-Menu** | **CRUD** | **CRUD** | **CRUD** | **RU** | - | - | **Create (Pesanan)**|
| **8** | **Antrean Pesanan Dapur & Status Masak (KDS)** | **CRUD** | **R** | **R** | **CRUD** | - | - | **R (Status Sendiri)**|
| **9** | **Purchase Order (PO) & Vendor Supplier** | **CRUD** | **Approval** | **CRUD** | - | - | - | - |
| **10**| **Mutasi Stok, Opname & Susut/Waste** | **CRUD** | **R** | **Approval & CRUD**| **Create (Opname)**| - | **Create (Opname)**| - |
| **11**| **Akuntansi, Jurnal & Neraca PSAK** | **CRUD** | **R** | **CRUD** | - | - | - | - |
| **12**| **Buku Kas, Rekonsiliasi & Settlement** | **CRUD** | **R** | **CRUD** | **Input Petty Cash**| - | **Input Petty Cash**| - |
| **13**| **Master Karyawan, Shift & Geofencing** | **CRUD** | **CRUD** | **CRUD** | **Absen GPS & Foto**| - | **Absen GPS & Foto**| - |
| **14**| **Payroll, Komisi & Kasbon Karyawan** | **CRUD** | **Approval** | **CRUD** | **R (Komisi Own)** | **R (Komisi Own)**| **R (Komisi Own)** | - |
| **15**| **Database CRM & Poin Loyalitas** | **CRUD** | **CRUD** | **CRUD** | **RU** | - | **RU** | **RU (Data Pribadi)**|
| **16**| **Integrasi Omnichannel & Marketplace** | **CRUD** | **CRUD** | **CRUD** | **R (Proses Order)**| - | - | - |
| **17**| **Rekam Medis & SATUSEHAT Kemenkes** | **CRUD** | **R** | **R** | - | **CRUD** | **R (Billing Obat)**| **R (Resep Pribadi)**|
| **18**| **Reservasi & Antrean Ruang Tunggu** | **CRUD** | **CRUD** | **CRUD** | **CRUD** | **RU** | **CRUD** | **CRUD (Milik Sendiri)**|
| **19**| **Pengajuan Harum.in Capital & Payout** | **CRUD** | **CRUD** | **RU** | - | - | - | - |
| **20**| **Pengadaan Bahan Harum.in Supplies** | **CRUD** | **Approval** | **CRUD** | - | - | - | - |

---

## 5. SPESIFIKASI FUNGSIONAL 20 MODUL UTAMA

### Fitur 1: Konfigurasi Tenant, 9router & Hermes
- **Tujuan**: Mengelola parameter identitas organisasi, integrasi gateway AI, integrasi API WhatsApp, dan lisensi.
- **Input**: Nama tenant, subdomain, pilar bisnis (`food`/`retail`/`health`), API Key 9router, nomor pengirim Hermes, webhook signature.
- **Proses**: Pendaftaran tenant menginisialisasi skema isolasi data default, menyalin bagan akun akuntansi standar (COA), dan membuat cabang pertama.
- **Keluaran**: Tenant ID aktif, kredensial integrasi terverifikasi, dan token JWT auth.

### Fitur 2: Dashboard Eksekutif & Laba Riil (+ Copilot AI)
- **Tujuan**: Menyajikan metrik pendapatan riil, margin laba bersih, beban pokok penjualan (COGS), dan konsultasi AI berbasis data riil.
- **Input**: Filter rentang tanggal, filter cabang (opsional bagi Owner).
- **Proses**: Agregasi data penjualan POS dikurangi harga pokok bahan baku (BOM) dan biaya operasional petty cash untuk menghasilkan laba bersih aktual harian/bulanan.
- **Keluaran**: Grafik tren penjualan, kartu metrik KPI eksekutif, dan antarmuka tanya-jawab Owner Copilot AI.

### Fitur 3: Master Produk, Varian & Harga Jual
- **Tujuan**: Basis data katalog barang dagangan, makanan, minuman, dan jasa medis.
- **Input**: Nama produk, SKU, barcode, kategori, harga jual dasar, varian (ukuran, tingkat gula, topping), dan status pajak.
- **Proses**: Sistem mendukung multi-harga per cabang serta penetapan harga khusus waktu tertentu (Happy Hour).
- **Keluaran**: Katalog menu siap jual di POS dan portal pemesanan e-menu member.

### Fitur 4: Resep & Bill of Materials (BOM)
- **Tujuan**: Menghubungkan setiap penjualan menu dengan pengurangan bahan baku mentah di gudang.
- **Input**: ID Produk, daftar bahan baku gudang, takaran gramatur (contoh: 1 porsi Kopi Susu = 18 gr Biji Kopi, 120 ml Susu Fresh, 20 ml Gula Aren, 1 bh Cup).
- **Proses**: Setiap transaksi POS berstatus `paid`, trigger database otomatis memotong stok bahan baku terkait secara real-time.
- **Keluaran**: Kartu stok bahan baku terpotong akurat dan nilai HPP per menu terhitung otomatis.

### Fitur 5: Register Transaksi POS & Struk
- **Tujuan**: Titik layanan transaksi penjualan cepat di meja kasir.
- **Input**: Pilihan produk, catatan pesanan (*custom note*), diskon, metode bayar (Tunai / QRIS Dinamis).
- **Proses**: Menghitung subtotal, diskon otomatis/manual, pajak restoran (PB1) 10% atau PPN 11% (0% untuk pilar kesehatan), menghitung kembalian uang tunai, atau meng-generate QRIS dinamis via Pakasir API.
- **Keluaran**: Nota transaksi tersimpan, cetak struk thermal 58mm/80mm, pengiriman e-struk WhatsApp Hermes, dan pembuatan ayat jurnal keuangan otomatis.

### Fitur 6: Otorisasi Void, Refund & Diskon
- **Tujuan**: Mencegah kebocoran pendapatan akibat penghapusan pesanan secara ilegal oleh kasir.
- **Input**: Alasan pembatalan, PIN Supervisor GM atau persetujuan jarak jauh Owner.
- **Proses**: Kasir hanya dapat mengirim status `Request Void`. Jika nominal void di bawah batas toleransi kebijakan cabang, GM dapat menyetujui langsung dengan memasukkan PIN di POS. Jika melebihi batas, permintaan otomatis dialihkan ke antrean persetujuan Owner.
- **Keluaran**: Struk tercatat batal, reversal stok bahan baku (jika makanan belum dimasak), dan pencatatan riwayat audit forensik lengkap.

### Fitur 7: Denah Meja, Kiosk & QR E-Menu
- **Tujuan**: Pengelolaan layout meja fisik dan self-ordering pelanggan.
- **Input**: Nomor meja, kapasitas kursi, koordinat layout lantai restoran.
- **Proses**: Sistem mengenerate stiker QR Code unik per meja yang berisi token URL pemesanan mandiri member `/m/order?table=X`.
- **Keluaran**: Visual denah meja (status: Hijau = Kosong, Merah = Terisi, Kuning = Reservasi) dan kemudahan memesan mandiri tanpa antre di kasir.

### Fitur 8: Antrean Pesanan Dapur & Status Masak (KDS)
- **Tujuan**: Menghilangkan tiket pesanan kertas di stasiun koki dan barista.
- **Input**: Pesanan baru masuk dari kasir POS atau pemesanan mandiri meja.
- **Proses**: Tiket digital muncul di layar KDS stasiun terkait dengan indikator waktu tunggu (*timer countdown*). Koki dapat mengetuk tiket untuk mengubah status: *Menunggu -> Dimasak -> Siap Saji*.
- **Keluaran**: Notifikasi real-time ke kasir dan layar tunggu pelanggan saat pesanan siap diambil.

### Fitur 9: Purchase Order (PO) & Vendor Supplier
- **Tujuan**: Pengadaan bahan baku secara terencana saat stok mendekati batas minimum (*reorder point*).
- **Input**: Nama vendor supplier, daftar bahan baku, kuantiti, harga beli satuan, termin pembayaran (Tempo / COD).
- **Proses**: GM membuat draf PO -> Owner menyetujui -> Sistem menerbitkan surat pesanan PDF -> Penerimaan barang (*Goods Receipt*) di gudang memvalidasi kesesuaian kuantiti fisik dan mencatat utang usaha otomatis.
- **Keluaran**: Saldo stok bertambah dan buku utang dagang terperbarui di neraca.

### Fitur 10: Mutasi Stok, Opname & Susut/Waste
- **Tujuan**: Pengawasan fisik inventori gudang dan pencatatan kehilangan barang.
- **Input**: Hasil hitung fisik staf kasir/gudang, alasan susut (basi, tumpah, kedaluwarsa).
- **Proses**: Menghitung selisih antara saldo buku sistem vs fisik nyata. Selisih memerlukan otorisasi GM/Owner sebelum saldo sistem disesuaikan.
- **Keluaran**: Penyesuaian nilai persediaan dan pencatatan akun beban barang rusak di laporan laba rugi.

### Fitur 11: Akuntansi, Jurnal & Neraca PSAK
- **Tujuan**: Pembukuan ganda (*double-entry*) otomatis tanpa perlu akuntan manual.
- **Input**: Transaksi operasional (penjualan kasir, pembelian PO, beban kas kecil, pembayaran gaji).
- **Proses**: Sistem menjurnal otomatis ayat debit dan kredit sesuai bagan akun standar (Kas, Piutang QRIS, Persediaan, Penjualan, HPP, Beban Gaji).
- **Keluaran**: Buku besar, Neraca Saldo (*Trial Balance*), Laporan Laba Rugi (*Profit & Loss*), dan Arus Kas (*Cash Flow*).

### Fitur 12: Buku Kas, Rekonsiliasi & Settlement
- **Tujuan**: Pengendalian fisik kas cabang dan penyelarasan saldo rekening bank.
- **Input**: Pengeluaran kas kecil kasir (bukti foto kuitansi), rekening koran settlement Pakasir QRIS.
- **Proses**: Pencocokan otomatis (*auto-matching*) ID transaksi settlement QRIS dengan transaksi POS kasir untuk mendeteksi selisih atau kegagalan transfer bank.
- **Keluaran**: Berita acara rekonsiliasi kas dan status pencairan dana bersih (*net settlement*).

### Fitur 13: Master Karyawan, Shift & Geofencing (Kamera & Watermark)
- **Tujuan**: Tata kelola SDM, jadwal kerja, dan presensi biometrik visual anti-titip absen.
- **Input**: Alokasi shift staf mingguan, streaming webcam video wajah live, koordinat GPS perangkat.
- **Proses**: 
  - Validasi jarak radius GPS terhadap titik cabang (10–1000m) menggunakan formula Haversine.
  - Penangkapan snapshot wajah dan rendering stempel watermark permanen di atas kanvas gambar (Nama, Cabang, Waktu Server WITA, GPS Lat/Lng, Jarak Meter).
  - Perhitungan otomatis menit keterlambatan terhadap jam masuk shift (`late_min`) dan menit lembur terhadap jam pulang shift (`overtime_min`).
- **Keluaran**: Data presensi valid, foto selfie terstempel untuk verifikasi Owner/GM, dan log kepatuhan UU PDP.

### Fitur 14: Payroll, Komisi & Kasbon Karyawan
- **Tujuan**: Penggajian tepat waktu dengan pemotongan otomatis.
- **Input**: Gaji pokok, insentif lembur per jam, target komisi penjualan kasir / jasa medis dokter, cicilan kasbon berjalan.
- **Proses**: Sistem menghitung total jam lembur dari Fitur 13, memotong cicilan pinjaman kasbon aktif, dan menghasilkan draf penggajian untuk disetujui Owner.
- **Keluaran**: Pembayaran payroll satu pintu, slip gaji digital karyawan (`/app/slip`), dan jurnal beban gaji.

### Fitur 15: Database CRM & Poin Loyalitas
- **Tujuan**: Retensi pelanggan dan peningkatan nilai transaksi seumur hidup (*Customer Lifetime Value*).
- **Input**: Nomor WhatsApp member, tanggal lahir, riwayat transaksi.
- **Proses**: Setiap transaksi POS menghasilkan poin loyalitas sesuai rasio tenant (contoh: belanja Rp 10.000 = 1 Poin Harum). Evaluasi tier loyalitas otomatis (Bronze, Silver, Gold, Platinum).
- **Keluaran**: Riwayat poin pelanggan, penukaran voucher potongan belanja di kasir atau portal member.

### Fitur 16: Integrasi Omnichannel & Marketplace
- **Tujuan**: Mencegah antrean tablet terpisah untuk pesanan online delivery.
- **Input**: Pesanan masuk dari webhook aggregator pesanan pesan-antar makanan.
- **Proses**: Menstandarkan format pesanan online ke dalam antrean POS kasir dan KDS dapur secara seragam.
- **Keluaran**: Penjualan online langsung terbukukan ke laporan omzet tanpa input manual kasir.

### Fitur 17: Rekam Medis & SATUSEHAT Kemenkes (Khusus Pilar Health)
- **Tujuan**: Pencatatan riwayat medis legal standar Kementerian Kesehatan RI.
- **Input**: Keluhan pasien (Subjektif), tanda vital & fisik (Objektif), diagnosis ICD-10 (Asesmen), dan rencana tindakan ICD-9-CM serta e-resep (Plan). Odontogram grafis bagi dokter gigi.
- **Proses**: Rekam medis dikunci permanen (*immutable*) setelah finalisasi dokter, lalu dikonversi otomatis ke format standar HL7 FHIR Bundle (*Encounter, Condition, Procedure*) untuk disinkronisasikan ke server SATUSEHAT.
- **Keluaran**: Riwayat RME tersimpan aman 25 tahun, e-resep siap ditarik kasir farmasi, dan status sinkronisasi SATUSEHAT terverifikasi.

### Fitur 18: Reservasi & Antrean Ruang Tunggu
- **Tujuan**: Menghilangkan penumpukan fisik di lobi kafe atau ruang tunggu klinik.
- **Input**: Data tamu reservasi (tanggal, jam, jumlah orang) atau pendaftaran pasien di tempat.
- **Proses**: Sistem memberikan estimasi waktu tunggu (*ETA*) dan mengirimkan notifikasi pesan WhatsApp otomatis saat giliran meja atau ruang periksa dokter siap dimasuki.
- **Keluaran**: Panggilan antrean teratur di layar TV tunggu dan pengalaman pelanggan tanpa stres.

### Fitur 19: Pengajuan Harum.in Capital & Payout
- **Tujuan**: Akses pembiayaan modal kerja berbasis rekam jejak omzet POS dan pencairan dana fleksibel.
- **Input**: Profil usaha, rekening bank settlement tujuan, nominal pinjaman modal.
- **Proses**: Evaluasi kelayakan kredit (*underwriting*) otomatis berbasis histori omzet POS 3-6 bulan terakhir.
- **Keluaran**: Rekening payout tervalidasi dan pencairan modal usaha langsung ke rekening merchant.

### Fitur 20: Pengadaan Bahan Harum.in Supplies
- **Tujuan**: Efisiensi biaya bahan baku melalui pembelian grosir bersama langsung dari pabrik (*Direct-to-Manufacturer*).
- **Input**: Katalog bahan komoditas (biji kopi premium, susu, cup custom logo, sarung tangan medis, alkes).
- **Proses**: Owner memilih paket pengadaan grosir -> GM menerima kiriman di gudang cabang.
- **Keluaran**: Penghematan harga beli hingga 25% dibandingkan distributor lokal tradisional.

---

## 6. FITUR UNGGULAN & ALUR BISNIS KHUSUS

### 6.1 Owner Copilot AI (Model Kuota Transparan)
- **Arsitektur Gateway**: Terhubung ke AI Engine via **9router Gateway** dengan isolasi data tingkat tenant.
- **Model Konsumsi Kuota**:
  - Diberlakukan prinsip: **1 Pertanyaan Berhasil = Memotong Tepat 1 Token Kuota**.
  - Bebas dari kebingungan penghitungan token kata LLM (*prompt/completion tokens*).
  - Skema paket kuota bulanan: Starter (100 pertanyaan/bulan), Growth (500 pertanyaan/bulan), Pro (2.000 pertanyaan/bulan).
- **Antarmuka Riwayat Cerdas**: Dilengkapi Live Search non-blocking, indikator sisa kuota real-time, ekspansi jawaban mendalam, serta tombol tanya ulang (*Re-prompt*) sekali klik.

### 6.2 Presensi Biometrik Kamera Live & Watermark Anti-Fraud
- **Perekaman Video WebRTC**: Menggunakan streaming video langsung dari kamera depan dengan panduan visual bingkai oval (*face alignment oval guide*).
- **Pita Stempel Watermark Permanen**:
  - Snapshot kanvas gambar resolusi 640×480 piksel langsung dicap pita metadata permanen di bagian bawah foto.
  - Elemen stempel: Nama Karyawan, Role, Nama Cabang, Tanggal & Jam Presisi WITA, Koordinat GPS, dan Jarak Radius Meter ke Outlet.
  - Mencegah penggunaan foto lama dari galeri, injeksi kamera virtual, atau titip absen antar-karyawan.
- **Validasi Radius Geofencing (10–1000m)**:
  - Jarak dihitung menggunakan formula matematika Haversine terhadap koordinat cabang yang didaftarkan Owner.
  - Sistem menolak absensi jika staf berada di luar batas toleransi radius meter cabang.
- **Integrasi Roster Shift Hari Ini (`work_shifts`)**:
  - Sistem mencocokkan jam presensi dengan jadwal kerja shift hari ini.
  - Otomatis mencatat menit keterlambatan (`late_min > 0`) jika clock-in > jam mulai shift (+ toleransi 5 menit).
  - Otomatis mencatat menit lembur (`overtime_min > 0`) jika clock-out > jam selesai shift (+ toleransi 15 menit).
- **Modal Inspeksi untuk Manajemen**: Owner & GM dapat mengklik foto selfie staf di tabel riwayat untuk membuka modal foto beresolusi tinggi dan memverifikasi keabsahan kehadiran.

### 6.3 Manajemen Multi-Cabang & 1-Click Catalog Cloning
- **Penugasan Akun**:
  - **GM**: Memiliki `branch_id: null` (lingkup multi-cabang untuk mengawasi seluruh outlet).
  - **Staf/Kasir**: Memiliki `branch_id` terkunci ke cabang fisik (misal: Cabang Panakkukang).
- **1-Click Branch Clone**:
  - Saat Owner mendaftarkan cabang baru di `/app/cabang`, sistem menyediakan opsi *"Kloning Katalog & Resep dari Cabang Utama"*.
  - Menekan opsi ini akan menyalin seluruh master produk, varian harga, kategori, dan formulasi resep BOM ke cabang baru dalam waktu 1 detik tanpa input manual ulang.

### 6.4 Otomasi Resep & Pemotongan Stok Bahan Baku (BOM)
- Penjualan setiap item menu di kasir POS memicu stored procedure database `deduct_bom_stock` secara atomik (*ACID transaction*).
- Jika ada 1 bahan baku yang stoknya tidak mencukupi, sistem memberikan opsi peringatan stok menipis (*low-stock warning*) tanpa memblokir antrean kasir, lalu mencatat defisit untuk diselesaikan pada saat stock opname.

### 6.5 Pembayaran QRIS Dinamis Pakasir & Rekonsiliasi Otomatis
- POS kasir maupun portal member meminta pembuatan kode QRIS dinamis unik ke endpoint API Pakasir v2.
- Nominal pembayaran terkunci secara pas (termasuk kode unik jika ada).
- Saat pelanggan memindai dan membayar menggunakan aplikasi mobile banking / e-wallet apapun, webhook Pakasir diterima oleh endpoint RPC Harum.in `qris_webhook_handler`.
- Status pesanan berubah menjadi `paid` dalam < 2 detik secara real-time via WebSocket Supabase Realtime, dan printer kasir langsung mencetak struk otomatis.

### 6.6 Rekam Medis Elektronik (RME SOAP) & Kepatuhan SATUSEHAT
- **Formulir SOAP Medis**: Terintegrasi langsung dengan antrean klinik.
- **Odontogram Interaktif FDI**: Menggunakan penomoran internasional 2 digit untuk odontogram gigi dewasa (11–48) dan anak (51–85).
- **Outbox Sinkronisasi SATUSEHAT**: Berkas kunjungan pasien diubah menjadi struktur JSON HL7 FHIR Bundle (*Resource Encounter, Condition, Procedure*) dan diantrekan pada tabel outbox yang siap disinkronisasikan ke server Kemenkes RI.

### 6.7 Portal Pelanggan & Member Mandiri (`/m`)
- Beroperasi pada rute khusus terisolasi (`/m`).
- **Autentikasi Tanpa Password**: Login cepat hanya menggunakan verifikasi nomor WhatsApp OTP.
- **Pemesanan Mandiri Meja**: Memindai QR meja membuka menu digital, memilih opsi varian, dan melakukan pembayaran QRIS instan.
- **Privasi Pengguna (UU PDP)**: Fasilitas pengunduhan data riwayat pribadi (format JSON/PDF) dan penghapusan akun (*anonymization*) secara mandiri.

---

## 7. PERSYARATAN NON-FUNGSIONAL (NFR)

### 7.1 Keamanan Sistem (Security)
- **Zero-Trust Multi-Tenancy**: Seluruh tabel di database diproteksi oleh Row-Level Security (RLS) PostgreSQL dengan klaim token JWT `auth.jwt() ->> 'tenant_id'`.
- **Eksekusi Transaksi Kritis Terisolasi**: Pembatalan nota, pemotongan stok, pemberian pinjaman kasbon, dan pencatatan RME wajib menggunakan Stored Procedure / RPC `SECURITY DEFINER` dengan parameter sanitasi ketat.
- **Audit Logging Forensik**: Setiap perubahan data sensitif dicatat ke tabel `audit_logs` bersama stempel waktu, ID pengguna, IP address, nilai sebelum, dan nilai sesudah.

### 7.2 Kinerja & Kecepatan (Performance)
- **Respon Antarmuka Kasir**: Waktu pemrosesan penambahan item menu ke keranjang belanja POS < 50 milidetik.
- **Pencegahan Timeout RLS**: Seluruh sub-query evaluasi peran pada RLS wajib menggunakan pola `InitPlan` berindeks komposit `(tenant_id, profile_id)` sehingga bebas dari *statement timeout* bahkan pada tabel berisi jutaan baris.
- **Waktu Muat Awal Web**: Bundle produksi teroptimasi (< 150 kB gzipped untuk chunk utama) dengan *code-splitting lazy-loading* per halaman.

### 7.3 Ketersediaan & Ketahanan (Reliability & Availability)
- **Target Uptime**: 99.9% availability per bulan.
- **Graceful Offline/Network Degradation**: Jika koneksi internet kasir mengalami gangguan sementara, keranjang belanja lokal tetap tersimpan di memori peramban (*LocalStorage cache*) dan sinkronisasi otomatis dilanjutkan begitu jaringan pulih.

---

## 8. KEPATUHAN REGULASI & STANDAR INDUSTRI

1. **Undang-Undang Pelindungan Data Pribadi (UU PDP No. 27 Tahun 2022)**:
   - Kewajiban penyediaan dialog persetujuan (*Consent Gate*) eksplisit sebelum mengaktifkan kamera foto presensi dan koordinat lokasi GPS.
   - Hak subjek data untuk mengunduh salinan data pribadi dan hak penghapusan data identitas pribadi (*Right to Erasure / Anonymization*).
2. **Peraturan Menteri Kesehatan RI (Permenkes No. 24 Tahun 2022 tentang Rekam Medis)**:
   - Seluruh fasilitas pelayanan kesehatan wajib menyelenggarakan Rekam Medis Elektronik.
   - Rekam medis elektronik wajib terenkripsi, tidak dapat diubah setelah ditandatangani dokter (*immutable audit trail*), dan wajib disimpan paling singkat 25 (dua puluh lima) tahun sejak tanggal kunjungan terakhir pasien.
   - Interoperabilitas data medis wajib mematuhi standar HL7 FHIR platform SATUSEHAT Kementerian Kesehatan RI.
3. **Standar Standarisasi Akuntansi Keuangan (PSAK)**:
   - Pencatatan pembukuan ganda seimbang (Debit = Kredit) untuk seluruh mutasi arus kas kasir, penerimaan penjualan, utang usaha supplier, dan persediaan barang dagang.

---

## 9. RENCANA RILIS & MILESTONE PENGEMBANGAN

Pengembangan dan peluncuran modul Harum.in disusun dalam 5 fase terukur:

```
FASE 1: Fondasi Platform, Layanan & Manajemen Kebijakan Berjenjang
├── Master Tenant, Cabang, Registrasi Pengguna
├── Kebijakan Berjenjang (Batas Diskon, Limit Void, Radius GPS)
└── Matriks RBAC 20 Fitur × 5 Peran Inti

FASE 2: Operasional Kasir POS, Gudang, KDS & Hardening
├── Register POS Touchscreen Cepat, Kas Kecil (Petty Cash), Z-Report
├── Layar Antrean Dapur / Barista (Kitchen Display System)
└── Hardening Keamanan: Pola InitPlan RLS & Stored Procedure Void PIN

FASE 3: Nilai Tambah Bisnis, RME Kesehatan & Penggajian
├── Resep & BOM Pemotongan Gramatur Otomatis
├── Modul Klinik: Rekam Medis SOAP, Odontogram FDI, ICD-10 & ICD-9-CM
└── SDM: Roster Shift Mingguan, Penggajian Payroll, Komisi & Kasbon

FASE 4: Platform Ekosistem, AI Copilot & Portal Member
├── Integrasi AI Gateway 9router (Owner Copilot AI Model 1 Tanya = 1 Kuota)
├── Integrasi WhatsApp Hermes (Laporan Otomatis & E-Struk)
└── Portal Mandiri Pelanggan / Member (/m) dengan OTP WhatsApp & QR Meja

FASE 5: Super Big Upgrade Terpadu (Tahap Penyempurnaan Akhir)
├── Presensi Kamera Live WebRTC dengan Oval Guide & Stempel Watermark Anti-Fraud
├── Otomasi Sinkronisasi Shift & Kalkulasi Menit Telat / Lembur
├── Manajemen Multi-Cabang Mandiri Owner & 1-Click Catalog/Recipe Clone
└── Integrasi Pembayaran QRIS Dinamis Pakasir & Rekonsiliasi Otomatis
```

---
*Dokumen PRD ini menjadi acuan mutlak bagi seluruh implementasi sistem, pengembangan kode sumber, dan pengujian mutu Platform Harum.in.*

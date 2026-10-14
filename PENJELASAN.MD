# DOKUMEN RBAC & FITUR LENGKAP PLATFORM HARUM.IN
**Dokumen Arsitektur Hak Akses Berjenjang (Role-Based Access Control) & Direktori Fitur Paripurna**  
*Versi: 2.5 (Super Big Upgrade) — Pembaruan Sistematis Terpadu*

---

## DAFTAR ISI
1. [Prinsip Arsitektur & Multi-Tenant Harum.in](#1-prinsip-arsitektur--multi-tenant-harumin)
2. [Matriks RBAC Utama (20 Fitur × Seluruh Peran)](#2-matriks-rbac-utama-20-fitur--seluruh-peran)
3. [Penjelasan Rinci Fitur Per Peran (Roles)](#3-penjelasan-rinci-fitur-per-peran-roles)
   - [3.1 Superadmin / Developer (L0 Platform)](#31-superadmin--developer-l0-platform)
   - [3.2 Owner Merchant (L1 F&B / Ritel)](#32-owner-merchant-l1-fb--ritel)
   - [3.3 General Manager / GM (L2 Multi-Cabang)](#33-general-manager--gm-l2-multi-cabang)
   - [3.4 Kasir / Staf (L3 F&B / Ritel / KDS / Gudang)](#34-kasir--staf-l3-fb--ritel--kds--gudang)
   - [3.5 Dokter / Terapis (L4 / L3 Health - Tenaga Medis)](#35-dokter--terapis-l4--l3-health---tenaga-medis)
   - [3.6 Kasir Klinik (L3 Health - Billing Farmasi & Medis)](#36-kasir-klinik-l3-health---billing-farmasi--medis)
   - [3.7 Owner Klinik (L1 Health - Pemilik Faskes / Praktik)](#37-owner-klinik-l1-health---pemilik-faskes--praktik)
   - [3.8 Member / Pelanggan (L5 Customer / Loyalty Portal)](#38-member--pelanggan-l5-customer--loyalty-portal)
4. [Katalog 20 Fitur Matriks RBAC (Bab V)](#4-katalog-20-fitur-matriks-rbac-bab-v)
5. [Integritas Script, Upgrade Terbaru & Pemeliharaan Logika](#5-integritas-script-upgrade-terbaru--pemeliharaan-logika)

---

## 1. PRINSIP ARSITEKTUR & MULTI-TENANT HARUM.IN

Harum.in dirancang sebagai **Cloud Operating System Multi-Tenant** dengan standar isolasi ketat tingkat perbankan (*Zero-Trust Database Security*):

```
+-----------------------------------------------------------------------------------+
|                           HARUM.IN PLATFORM ENGINE                                |
+-----------------------------------------------------------------------------------+
|  L0: Superadmin / Developer (Global Governance, Integrasi 9router, Hermes, Pakasir)|
+-----------------------------------------------------------------------------------+
       |                                          |
       v (Tenant Isolation: tenant_id)            v (Tenant Isolation: tenant_id)
+----------------------------------+       +------------------------------------+
|  TENANT PILAR F&B & RITEL        |       |  TENANT PILAR HEALTH (KLINIK)      |
|  (Kafe, Resto, Coffee Shop, Toko)|       |  (Klinik Pratama, Gigi, Estetika)  |
+----------------------------------+       +------------------------------------+
| L1: Owner Merchant               |       | L1: Owner Klinik                   |
| L2: General Manager (GM)         |       | L2: Manajer Operasional Klinik     |
| L3: Kasir / Staf / Barista / KDS |       | L3: Kasir Klinik & Farmasi         |
|                                  |       | L4: Dokter / Terapis (RME SOAP)    |
+----------------------------------+       +------------------------------------+
       |                                          |
       +--------------------+---------------------+
                            v
               L5: Member / Pelanggan Portal (/m)
```

### Pilar Isolasi Bisnis:
1. **Pilar F&B & Ritel (`food`, `retail`, `service`)**:
   - Menjalankan register POS kasir, kitchen order display (KDS), denah meja, varian resep/BOM, dan pesanan online delivery.
2. **Pilar Health (`health`)**:
   - Menjalankan Rekam Medis Elektronik (RME SOAP), odontogram gigi FDI, katalog ICD-10 & ICD-9-CM, bridging Kemenkes SATUSEHAT (HL7 FHIR), dan kasir billing farmasi tanpa pajak (PPN kesehatan 0%).

### Keamanan Berjenjang (Supabase RLS):
- **Row-Level Security (RLS)** aktif di setiap tabel dengan kebijakan multi-tenant `tenant_id = auth.jwt() ->> 'tenant_id'`.
- Sub-query RLS diproteksi dengan pola `InitPlan` berindeks komposit (bebas *statement timeout*).
- Transaksi kritis (void, refund, pemotongan stok, otorisasi diskon, klaim poin, pencatatan rekam medis) hanya dapat dieksekusi melalui **Stored Procedure / RPC Berkeamanan Tinggi** (`SECURITY DEFINER`).

---

## 2. MATRIKS RBAC UTAMA (20 FITUR × SELURUH PERAN)

Berikut adalah Matriks Otorisasi Resmi Harum.in (menggabungkan Matriks 20×5 Asli Dokumen Blueprint Bab IV + Peran Member L5 + Spesialisasi Pilar Klinik):

| No | Fitur Matriks | Superadmin (L0) | Owner (L1) | GM (L2) | Kasir/Staf (L3) | Dokter (L4) | Kasir Klinik (L3) | Member (L5) |
|---|---|---|---|---|---|---|---|---|
| **1** | **Konfigurasi Tenant, 9router & Hermes** | **CRUD** | **R** | - | - | - | - | - |
| **2** | **Dashboard Eksekutif & Laba Riil (+ Copilot AI)** | **R** | **CRUD** | **R (Operasional)** | - | - | - | - |
| **3** | **Master Produk, Varian & Harga Jual** | **CRUD** | **CRUD** | **CRUD** | **R** | **R** | **R** | **R (Katalog)** |
| **4** | **Resep & Bill of Materials (BOM)** | **CRUD** | **CRUD** | **CRUD** | **R** | - | - | - |
| **5** | **Register Transaksi POS & Struk** | - | **R** | **R** | **CRUD** | - | **CRUD (Medis)** | **R (Pesanan Sendiri)** |
| **6** | **Otorisasi Void, Refund & Diskon** | - | **Approval** | **Approval (PIN)** | **Request** | - | **Request** | - |
| **7** | **Denah Meja, Kiosk & QR E-Menu** | **CRUD** | **CRUD** | **CRUD** | **RU** | - | - | **Create (Pesanan)** |
| **8** | **Antrean Pesanan Dapur & Status Masak** | **CRUD** | **R** | **R** | **CRUD** | - | - | **R (Status Sendiri)** |
| **9** | **Purchase Order (PO) & Vendor Supplier** | **CRUD** | **Approval** | **CRUD** | - | - | - | - |
| **10** | **Mutasi Stok, Opname & Susut/Waste** | **CRUD** | **R** | **Approval & CRUD** | **Create (Opname)** | - | **Create (Opname)** | - |
| **11** | **Akuntansi, Jurnal & Neraca PSAK** | **CRUD** | **R** | **CRUD** | - | - | - | - |
| **12** | **Buku Kas, Rekonsiliasi & Settlement** | **CRUD** | **R** | **CRUD** | **Input Petty Cash** | - | **Input Petty Cash**| - |
| **13** | **Master Karyawan, Shift & Geofencing** | **CRUD** | **CRUD** | **CRUD** | **Absen GPS (Own)** | - | **Absen GPS (Own)** | - |
| **14** | **Payroll, Komisi & Kasbon Karyawan** | **CRUD** | **Approval** | **CRUD** | **R (Komisi Own)** | **R (Komisi Own)**| **R (Komisi Own)** | - |
| **15** | **Database CRM & Poin Loyalitas** | **CRUD** | **CRUD** | **CRUD** | **RU** | - | **RU** | **RU (Data Pribadi)** |
| **16** | **Integrasi Omnichannel & Marketplace** | **CRUD** | **CRUD** | **CRUD** | **R (Proses Order)**| - | - | - |
| **17** | **Rekam Medis & SATUSEHAT Kemenkes** | **CRUD** | **R** | **R** | - | **CRUD** | **R (Billing Obat)** | **R (Resep Pribadi)** |
| **18** | **Reservasi & Antrean Ruang Tunggu** | **CRUD** | **CRUD** | **CRUD** | **CRUD** | **RU** | **CRUD** | **CRUD (Milik Sendiri)**|
| **19** | **Pengajuan Harum.in Capital & Payout** | **CRUD** | **CRUD** | **RU** | - | - | - | - |
| **20** | **Pengadaan Bahan Harum.in Supplies** | **CRUD** | **Approval** | **CRUD** | - | - | - | - |

> **Keterangan Notasi Hak Akses**:
> - **CRUD**: Create, Read, Update, Delete (Hak penuh).
> - **RU**: Read & Update (Dapat membaca dan memperbarui data tertentu).
> - **R**: Read Only (Hanya melihat data).
> - **Approval**: Memiliki kewenangan menyetujui / menolak pengajuan dana, void, payroll, atau PO.
> - **Approval (PIN)**: Otorisasi langsung kasir menggunakan PIN Supervisor/Manajer di register.
> - **Request**: Mengajukan permintaan persetujuan (contoh: void transaksi oleh kasir).
> - **Scope Khusus (`own`, `katalog`, dll)**: Akses dibatasi ketat hanya pada data milik aktor tersebut.

---

## 3. PENJELASAN RINCI FITUR PER PERAN (ROLES)

### 3.1 SUPERADMIN / DEVELOPER (L0 PLATFORM)
Aktor tertinggi pengelola platform SaaS Harum.in lintas tenant di seluruh Indonesia.

* **Tujuan Peran**: Menjaga infrastruktur, stabilitas integrasi pihak ketiga, tata kelola langganan tenant, dan kepatuhan sistem.
* **Fitur Utama**:
  1. **Konfigurasi Platform & Tenant (`/app/platform`, `/app/tenant`)**: Mendaftarkan bisnis baru, mengatur pilar bisnis (`food`, `retail`, `health`), serta menetapkan batas kuota cabang.
  2. **Integrasi Gateway 9router & Hermes (`/app/integrasi`)**: Memonitor koneksi AI Engine 9router (LLM DeepSeek/OpenAI), API WhatsApp Gateway Hermes, dan Payment Gateway Pakasir QRIS.
  3. **Manajemen Paket, Langganan & Kuota AI (`/app/paket`, `/app/platform-ops`)**:
     - Mengatur kuota AI Owner Copilot tiap tenant melalui RPC `set_ai_quota`.
     - Memberikan jatah pertanyaan bulanan (misal paket Starter 100 tanya, Growth 500 tanya, Pro 2000 tanya) serta memonitor konsumsi 1 pertanyaan = 1 token kuota.
     - Penagihan komisi platform (Take-Rate) dan status tagihan langganan SaaS.
  4. **Rekonsiliasi Pembayaran Terpusat (`/app/rekonsiliasi`)**: Memonitor arus transaksi QRIS dinamis Pakasir secara real-time di seluruh merchant.
  5. **Platform Audit Log (`/app/audit`)**: Memantau seluruh jejak aktivitas sensitif di database untuk keperluan audit keamanan, forensik, dan regulasi perlindungan data.
  6. **Blueprint Privat (`/app/blueprint`)**: Dokumentasi sistem, arsitektur teknis, dan pemetaan alur kerja Harum.in.

---

### 3.2 OWNER MERCHANT (L1 F&B / RITEL)
Pemilik bisnis kuliner, kafe, restoran, atau ritel yang memegang kendali strategis dan finansial usahanya.

* **Tujuan Peran**: Memaksimalkan laba riil, mengendalikan arus kas, menyetujui pengeluaran modal, dan mengambil keputusan bisnis berbasis data.
* **Fitur Utama**:
  1. **Dashboard Eksekutif & Laba Riil (`/app/dashboard`)**: Metrik pendapatan bersih harian/bulanan, omzet kotor, COGS/HPP aktual, estimasi laba bersih, dan tren transaksi.
  2. **Owner Copilot AI (`/app/copilot`)**:
     - Asisten AI bisnis pribadi berbasis 9router yang menganalisis database riil usaha (kas, stok, void, profitabilitas menu).
     - Menggunakan model kuota transparan: **1 pertanyaan = 1 token kuota**.
     - Panel Riwayat Analisis Bisnis yang dilengkapi Live Search canggih, status kuota real-time, ekspansi jawaban, dan tombol tanya ulang.
  3. **Laba Rugi Otomatis (`/app/laba-rugi`)**: Laporan P&L otomatis berdasarkan penjualan POS dan pemotongan stok bahan baku (BOM).
  4. **Pusat Persetujuan Tingkat Tinggi (`/app/persetujuan`)**:
     - Menyetujui/menolak Void transaksi kasir yang melebihi limit GM.
     - Menyetujui Purchase Order (PO) pembelian bernilai besar dari GM.
     - Menyetujui pengajuan penggajian karyawan (Payroll) dan pembagian komisi.
     - Menyetujui selisih penyesuaian stok opname dan barang susut/waste.
  5. **Harum.in Capital & Payout (`/app/capital`)**: Mengajukan pinjaman modal usaha terintegrasi dan mengatur rekening pencairan dana settlement QRIS.
  6. **Laporan Hermes WhatsApp (`/app/hermes`)**: Pengaturan pengiriman ringkasan omzet otomatis setiap malam langsung ke nomor WhatsApp Owner.
  7. **Manajemen Tim & Kebijakan Berjenjang (`/app/layanan/tim`, `/app/layanan/kebijakan`)**: Menentukan batas maksimal diskon kasir, toleransi void transaksi, dan radius GPS absensi geofencing.

---

### 3.3 GENERAL MANAGER / GM (L2 MULTI-CABANG)
Pemimpin operasional lapangan yang mengawasi operasional harian, dapur, gudang, staf kasir, dan akuntansi cabang.

* **Tujuan Peran**: Menjaga efisiensi operasional cabang, menekan biaya susut/waste, dan memastikan standar pelayanan terpenuhi.
* **Fitur Utama**:
  1. **Dashboard Operasional Cabang (`/app/dashboard`)**: Melihat performa penjualan per cabang, kecepatan layanan kasir, dan utilisasi meja.
  2. **Master Produk, Menu & Harga (`/app/produk`)**: Mengatur katalog makanan/minuman, menetapkan varian (ukuran, tingkat kepedasan, topping), dan harga jual cabang.
  3. **Resep & Bill of Materials / BOM (`/app/resep`)**: Merumuskan takaran gramatur bahan baku per porsi menu agar pemotongan stok gudang berjalan otomatis setiap ada penjualan di POS.
  4. **Manajemen Stok, Gudang & Transfer (`/app/stok`, `/app/transfer`)**: Memantau saldo stok bahan baku, melakukan mutasi transfer barang antar-cabang, dan approval opname.
  5. **Pengadaan & Vendor Supplier (`/app/pembelian`)**: Membuat Purchase Order (PO) ke vendor pemasok bahan baku saat stok menipis mendekati reorder point.
  6. **Otorisasi Void & Diskon Cepat**: Menginput PIN Supervisor di layar POS kasir saat staf kasir meminta pembatalan transaksi salah input atau pemberian diskon khusus.
  7. **Akuntansi, Jurnal & Neraca PSAK (`/app/jurnal`, `/app/neraca`)**: Pencatatan pembukuan ganda (double-entry), penutupan buku kas harian, dan rekonsiliasi bank/QRIS.
  8. **SDM, Jadwal Kerja & Payroll (`/app/karyawan`, `/app/payroll`)**: Mengatur roster jadwal kerja shift staf, menyetujui tukar shift, menghitung jam lembur, dan menyusun draf payroll gaji.

---

### 3.4 KASIR / STAF (L3 F&B / RITEL / KDS / GUDANG)
Garis depan pelayanan usaha yang berinteraksi langsung dengan pelanggan dan memproses pesanan di outlet.

* **Tujuan Peran**: Melayani transaksi secara cepat dan akurat, menyiapkan pesanan, serta mencatat pergerakan fisik barang.
* **Fitur Utama**:
  1. **Register Transaksi Kasir POS (`/app/kasir`)**:
     - Antarmuka kasir layar sentuh ultra-cepat: navigasi kategori produk, pemilihan varian, catatan pesanan khusus (*less sugar*, tanpa es).
     - Pembayaran multi-metode: Tunai (dengan hitung kembalian cepat) dan **QRIS Dinamis Pakasir** (tampil di layar / cetak struk dengan verifikasi webhook otomatis).
     - Cetak struk ke printer thermal (Bluetooth/USB) atau pengiriman struk digital via WhatsApp Hermes.
  2. **Permintaan Otorisasi Void / Refund (`Request`)**: Kasir tidak dapat menghapus pesanan sembarangan; wajib menekan "Minta Void" yang membutuhkan approval PIN GM atau otorisasi Owner.
  3. **Buka / Tutup Shift & Z-Report (`/app/shift`)**: Menginput kas awal modal laci, mencatat penerimaan kas selama shift, dan mencetak laporan Z-Report rekonsiliasi saat serah terima pergantian shift.
  4. **Layar Antrean Dapur / Kitchen Display System (`/app/dapur`)**: Layar visual untuk barista/koki: melihat antrean tiket pesanan masuk, menandai "Sedang Dimasak", dan mengubah status menjadi "Siap Disajikan".
  5. **Kas Kecil Cabang (`/app/kas`)**: Menginput pengeluaran kas operasional mendesak (pembelian es batu darurat, air galon, parkir) disertai bukti foto struk.
  6. **Opname Fisik & Catatan Waste (`/app/opname`)**: Menghitung stok fisik bahan baku harian dan mencatat bahan yang rusak/kedaluwarsa.
  7. **Absensi GPS Geofencing (`/app/absen`)**: Melakukan absensi clock-in dan clock-out dengan validasi radius lokasi GPS cabang.
  8. **Komisi & Slip Gaji Pribadi (`/app/slip`)**: Kasir hanya dapat melihat riwayat absensi, rincian komisi penjualan pribadi, dan slip gaji miliknya sendiri (`scope: own`).

---

### 3.5 DOKTER / TERAPIS (L4 / L3 HEALTH - TENAGA MEDIS)
Tenaga medis profesional (dokter gigi, dokter umum, dokter spesialis kulit/estetika, fisioterapis) pada tenant pilar kesehatan.

* **Tujuan Peran**: Memberikan pelayanan kesehatan, mendiagnosis pasien, melakukan tindakan medis, dan mendokumentasikan rekam medis legal.
* **Fitur Utama**:
  1. **Pemeriksaan Rekam Medis Elektronik / RME SOAP (`/app/pemeriksaan`)**:
     - Format standar medis SOAP: Subjektif (keluhan pasien), Objektif (tanda vital & pemeriksaan fisik), Asesmen (diagnosis), dan Plan (rencana terapi).
  2. **Odontogram Gigi Interaktif (Khusus Poli Gigi)**:
     - Menggunakan sistem penomoran FDI 2-digit internasional (gigi dewasa 11–48 dan gigi sulung 51–85).
     - Menandai kondisi klinis: karies/tambalan, missing, impaksi, crown, dan riwayat tindakan secara grafis.
  3. **Katalog Diagnosis ICD-10 & Tindakan ICD-9-CM**:
     - Pencarian cepat kode penyakit resmi Kemenkes (contoh: K02.1 Karies dentin, K05.1 Gingivitis kronis).
     - Pemilihan kode tindakan medis resmi (contoh: 23.2 Tambal komposit, 96.54 Scaling & polishing, 23.09 Cabut gigi).
  4. **Pembuatan Resep Elektronik (e-Resep)**:
     - Meresepkan obat, dosis, aturan pakai (*signa*), dan jumlah obat yang langsung terkirim secara real-time ke layar Farmasi & Kasir Klinik.
  5. **Bridging SATUSEHAT Kemenkes RI**:
     - Pembuatan berkas HL7 FHIR Bundle kunjungan medis (*Encounter, Condition, Procedure*) yang siap disinkronisasikan ke server Kementerian Kesehatan RI.
  6. **Jadwal Pasien & Antrean Klinik (`/app/antrean`)**: Melihat daftar antrean pasien ruang tunggu yang siap dipanggil ke ruang praktik.
  7. **Slip Komisi Tindakan Medis (`/app/slip`)**: Memantau bagi hasil jasa medis (Jaspel) pribadi secara transparan.

---

### 3.6 KASIR KLINIK (L3 HEALTH - BILLING FARMASI & MEDIS)
Tenaga administrasi medis dan kasir farmasi di klinik pratama atau klinik gigi/estetika.

* **Tujuan Peran**: Mengelola antrean registrasi pasien, memvalidasi resep obat, memproses pembayaran jasa medis, dan mencetak bukti pembayaran.
* **Fitur Utama**:
  1. **Registrasi Pasien Baru & Ruang Tunggu (`/app/antrean`)**:
     - Input data identitas pasien, nomor telepon WhatsApp, dan Nomor Induk Kependudukan (NIK KTP 16 digit).
     - Menetapkan nomor urut antrean poli/dokter yang bertugas.
  2. **Billing Tagihan Klinik & e-Resep (`/app/tagihan`)**:
     - Menarik otomatis seluruh rincian tindakan medis yang telah diinput dokter dari RME.
     - Menarik otomatis resep obat yang diterbitkan dokter, memvalidasi ketersediaan stok obat apotek klinik, dan menghitung total tagihan.
     - **Ketentuan Pajak Medis**: Bebas pajak PPN (0%) sesuai regulasi perpajakan layanan kesehatan Indonesia.
  3. **Penerimaan Pembayaran Medis**:
     - Menerima pembayaran tunai, kartu debit/kredit, atau QRIS Dinamis Pakasir.
     - Cetak kwitansi rincian tindakan medis dan obat untuk keperluan klaim asuransi pasien.
  4. **Shift Kasir Farmasi & Rekonsiliasi**: Penutupan kas loket pendaftaran dan farmasi.
  5. **Absensi & Slip Gaji Pribadi**: Melakukan presensi GPS dan melihat slip gaji sendiri.

---

### 3.7 OWNER KLINIK (L1 HEALTH - PEMILIK FASKES / PRAKTIK)
Dokter pemilik atau investor pengelola fasilitas pelayanan kesehatan.

* **Tujuan Peran**: Memastikan mutu layanan medis, keberlanjutan finansial klinik, pengawasan farmasi, dan kepatuhan terhadap regulasi Kementerian Kesehatan.
* **Fitur Utama**:
  1. **Dashboard Kinerja Klinik (`/app/dashboard`)**:
     - Jumlah kunjungan pasien harian/bulanan, rasio pasien baru vs pasien kontrol lama.
     - Tren pendapatan tindakan medis per dokter (jasa medis) vs penjualan obat apotek.
  2. **Owner Copilot AI Kesehatan (`/app/copilot`)**:
     - Analisis tren penyakit terbanyak (ICD-10 terpopuler), utilisasi alat medis, dan efisiensi obat farmasi.
     - Model kuota: 1 pertanyaan = 1 token kuota.
  3. **Kepatuhan SATUSEHAT Kemenkes & Legalitas RME**:
     - Memonitor status pengiriman data outbox FHIR ke SATUSEHAT.
     - Memastikan standar penyimpanan rekam medis elektronik terisolasi dan tersimpan minimal 25 tahun sesuai Permenkes No. 24 Tahun 2022.
  4. **Pengawasan Stok Farmasi & PO Obat (`/app/stok`, `/app/pembelian`)**:
     - Menyetujui pembelian obat-obatan keras/antibiotik ke Pedagang Besar Farmasi (PBF).
     - Meninjau laporan obat mendekati kedaluwarsa (*near-expired*) dan selisih opname farmasi.
  5. **Penggajian Dokter & Jasa Medis (`/app/payroll`)**: Menghitung dan menyetujui komisi jasa medis (*fee for service*) bagi dokter mitra.

---

### 3.8 MEMBER / PELANGGAN (L5 CUSTOMER / LOYALTY PORTAL)
Pelanggan setia kafe/restoran atau pasien yang terdaftar di klinik.

* **Tujuan Peran**: Menikmati pengalaman transaksi mandiri, memantau poin hadiah, melihat riwayat pesanan, dan melakukan reservasi tanpa antre.
* **Fitur Utama (Cangkang Khusus `/m`)**:
  1. **Autentikasi Tanpa Password (OTP WhatsApp)**: Login instan hanya menggunakan nomor WhatsApp yang divalidasi via kode OTP resmi Harum.in.
  2. **Kartu Member Digital (`/m/card`)**:
     - Menampilkan QR Code Member ID unik untuk dipindai oleh kasir saat pembayaran.
     - Status tier loyalitas (Bronze, Silver, Gold, Platinum) dan akumulasi saldo Poin Harum.
  3. **E-Menu & Pemesanan Mandiri (`/m/order`)**:
     - Pelanggan dapat memindai QR meja di outlet, melihat katalog menu digital beserta foto dan deskripsi, memilih varian, dan langsung memesan sendiri dari ponselnya.
  4. **Pembayaran Mandiri QRIS Pakasir**:
     - Menampilkan QRIS dinamis langsung di layar HP pelanggan dengan nominal pas; status pesanan terkonfirmasi otomatis dalam hitungan detik setelah bayar.
  5. **Reservasi Meja & Janji Temu Dokter (`/m/reserve`)**:
     - Reservasi meja makan untuk F&B (jumlah kursi, tanggal, jam kedatangan).
     - Booking antrean janji konsultasi dokter di klinik (input NIK pasien dan pemilihan dokter).
  6. **Riwayat Pesanan & Tagihan Medis Pribadi (`/m/history`)**:
     - Pelanggan dapat melihat kembali e-struk transaksi lama, riwayat resep obat yang pernah diterima, dan status pesanan aktif.
  7. **Privasi & Hak Pengguna (UU PDP / GDPR - `/m/privacy`)**:
     - **Hak Akses Data**: Unduh seluruh riwayat transaksi pribadi dalam format JSON/PDF.
     - **Hak Dilupakan (Anonymization)**: Menghapus profil member secara permanen; data pesanan lama dianonimkan untuk keperluan pembukuan legal tanpa jejak identitas pribadi.

---

## 4. KATALOG 20 FITUR MATRIKS RBAC (BAB V)

Berikut adalah rincian teknis 20 modul fitur matriks RBAC:

### FITUR 1: KONFIGURASI TENANT, 9ROUTER & HERMES
* **Kode Modul**: `F1` | **Kategori**: Platform & Keamanan
* **Deskripsi**: Pusat manajemen identitas tenant, konektivitas AI Gateway 9router (LLM), API WhatsApp Gateway Hermes, dan kredensial webhook.
* **Akses**: Superadmin (`CRUD`), Owner (`R`). GM, Staf, Dokter (`-`).

### FITUR 2: DASHBOARD EKSEKUTIF & LABA RIIL (+ OWNER COPILOT AI)
* **Kode Modul**: `F2` & `F2·AI` | **Kategori**: Intelijen Bisnis
* **Deskripsi**: Pemantauan omzet kotor, laba bersih riil, rasio beban pokok penjualan (COGS), serta asisten tanya-jawab AI bisnis (Owner Copilot) berbasis data transaksi riil.
* **Akses**: Owner (`CRUD`), Superadmin (`R`), GM (`R Operasional`), Member (`-`).

### FITUR 3: MASTER PRODUK, VARIAN & HARGA JUAL
* **Kode Modul**: `F3` | **Kategori**: Katalog & Menu
* **Deskripsi**: Master basis data SKU barang/menu, penetapan ukuran/varian, kategori departemen, pengaturan harga jual per cabang, dan promo diskon.
* **Akses**: Superadmin (`CRUD`), Owner (`CRUD`), GM (`CRUD`), Kasir/Staf (`R`), Dokter (`R`), Member (`R Katalog`).

### FITUR 4: RESEP & BILL OF MATERIALS (BOM)
* **Kode Modul**: `F4` | **Kategori**: Produksi & Inventori
* **Deskripsi**: Perumusan komposisi bahan mentah dari gudang untuk menghasilkan 1 porsi menu jadi. Pemotongan stok bahan baku di trigger secara otomatis saat POS mencetak pesanan.
* **Akses**: Superadmin (`CRUD`), Owner (`CRUD`), GM (`CRUD`), Staf (`R`), Dokter (`-`), Member (`-`).

### FITUR 5: REGISTER TRANSAKSI POS & STRUK
* **Kode Modul**: `F5` | **Kategori**: Penjualan Kasir
* **Deskripsi**: Layar transaksi penjualan kasir, perhitungan subtotal, diskon, pajak, pemrosesan pembayaran (Tunai & QRIS Pakasir), pembukaan/penutupan shift kasir, dan cetak Z-Report.
* **Akses**: Kasir/Staf (`CRUD`), Kasir Klinik (`CRUD Medis`), Owner (`R`), GM (`R`), Member (`R Pesanan Sendiri`).

### FITUR 6: OTORISASI VOID, REFUND & DISKON
* **Kode Modul**: `F6` | **Kategori**: Pengendalian Kasir
* **Deskripsi**: Pembatasan anti-kecurangan kasir. Pembatalan struk yang sudah tersimpan (void), pengembalian dana (refund), atau pemberian diskon di luar wewenang kasir wajib mendapat otorisasi.
* **Akses**: Owner (`Approval`), GM (`Approval dengan PIN Supervisor`), Kasir/Staf (`Request Only`).

### FITUR 7: DENAH MEJA, KIOSK & QR E-MENU
* **Kode Modul**: `F7` | **Kategori**: Layanan Meja & Self-Service
* **Deskripsi**: Pemetaan layout meja outlet, penomoran meja, status meja (kosong, terisi, reservasi), cetak stiker QR code meja, dan integrasi kiosk pemesanan mandiri.
* **Akses**: Superadmin (`CRUD`), Owner (`CRUD`), GM (`CRUD`), Kasir/Staf (`RU`), Member (`Create Pesanan Sendiri`).

### FITUR 8: ANTREAN PESANAN DAPUR & STATUS MASAK (KDS)
* **Kode Modul**: `F8` | **Kategori**: Operasional Dapur
* **Deskripsi**: Layar Kitchen Display System (KDS) untuk stasiun dapur/bar. Menampilkan tiket pesanan secara berurutan, timer waktu tunggu pesanan, dan penanda selesai masak.
* **Akses**: Kasir/Staf (`CRUD`), Superadmin (`CRUD`), Owner (`R`), GM (`R`), Member (`R Status Pesanan Sendiri`).

### FITUR 9: PURCHASE ORDER (PO) & VENDOR SUPPLIER
* **Kode Modul**: `F9` | **Kategori**: Pengadaan Barang
* **Deskripsi**: Manajemen data rekanan supplier, pembuatan surat pesanan pembelian bahan baku (PO), penerimaan barang gudang (*Goods Receipt*), dan pencatatan utang usaha.
* **Akses**: GM (`CRUD`), Owner (`Approval`), Superadmin (`CRUD`), Staf (`-`).

### FITUR 10: MUTASI STOK, OPNAME & SUSUT/WASTE
* **Kode Modul**: `F10` | **Kategori**: Manajemen Gudang
* **Deskripsi**: Pencatatan kartu stok, pergerakan barang antar-gudang cabang, penghitungan fisik periodik (stock opname), dan pencatatan bahan rusak/kedaluwarsa (waste).
* **Akses**: GM (`Approval & CRUD`), Owner (`R`), Kasir/Staf (`Create Opname/Waste Only`).

### FITUR 11: AKUNTANSI, JURNAL & NERACA PSAK
* **Kode Modul**: `F11` | **Kategori**: Keuangan & Akuntansi
* **Deskripsi**: Sistem akuntansi buku besar otomatis berbasis PSAK. Setiap transaksi POS dan pembayaran PO langsung membukukan ayat jurnal debit/kredit, menghasilkan neraca saldo dan arus kas.
* **Akses**: Superadmin (`CRUD`), GM (`CRUD`), Owner (`R`), Staf (`-`).

### FITUR 12: BUKU KAS, REKONSILIASI & SETTLEMENT
* **Kode Modul**: `F12` | **Kategori**: Keuangan & Kas
* **Deskripsi**: Buku kas kecil (petty cash) cabang, pencatatan mutasi kas bank, serta rekonsiliasi pembayaran digital QRIS dinamis Pakasir vs laporan bank.
* **Akses**: Superadmin (`CRUD`), GM (`CRUD`), Owner (`R`), Kasir/Staf (`Input Petty Cash Only`).

### FITUR 13: MASTER KARYAWAN, SHIFT & GEOFENCING
* **Kode Modul**: `F13` | **Kategori**: Sumber Daya Manusia (SDM)
* **Deskripsi**: Basis data staf/karyawan, penugasan cabang, penyusunan jadwal kerja shift mingguan, dan pencatatan presensi GPS dengan batasan radius geofencing lokasi outlet.
* **Akses**: Owner (`CRUD`), GM (`CRUD`), Superadmin (`CRUD`), Staf (`Absen GPS Masuk/Pulang Milik Sendiri`).

### FITUR 14: PAYROLL, KOMISI & KASBON KARYAWAN
* **Kode Modul**: `F14` | **Kategori**: Penggajian & Remunerasi
* **Deskripsi**: Penghitungan gaji pokok, uang lembur otomatis dari data absensi, pemotongan pinjaman/kasbon, dan perhitungan komisi target penjualan atau jasa medis dokter.
* **Akses**: GM (`CRUD`), Owner (`Approval`), Staf & Dokter (`R Komisi Pribadi Milik Sendiri`).

### FITUR 15: DATABASE CRM & POIN LOYALITAS
* **Kode Modul**: `F15` | **Kategori**: Hubungan Pelanggan (CRM)
* **Deskripsi**: Database pelanggan terintegrasi nomor WhatsApp, pencatatan total belanja (LTV), aturan perolehan poin belanja (*reward points*), penukaran voucher, dan tingkat membership.
* **Akses**: Superadmin (`CRUD`), Owner (`CRUD`), GM (`CRUD`), Kasir/Staf (`RU`), Member (`RU Profil & Poin Pribadi`).

### FITUR 16: INTEGRASI OMNICHANNEL & MARKETPLACE
* **Kode Modul**: `F16` | **Kategori**: Integrasi Saluran Penjualan
* **Deskripsi**: Agregasi pesanan online dari layanan pesan-antar makanan dan e-commerce ke dalam satu layar kasir tanpa perlu input ulang manual di tablet terpisah.
* **Akses**: Superadmin (`CRUD`), Owner (`CRUD`), GM (`CRUD`), Kasir/Staf (`R Proses Pesanan Masuk`).

### FITUR 17: REKAM MEDIS & SATUSEHAT KEMENKES
* **Kode Modul**: `F17` | **Kategori**: Khusus Pilar Kesehatan (`health`)
* **Deskripsi**: Modul Rekam Medis Elektronik (RME) standar Permenkes 24/2022. Mencakup anamnesis SOAP, odontogram gigi FDI, kode ICD-10 & ICD-9-CM, e-resep, dan bridging HL7 FHIR SATUSEHAT.
* **Akses**: Dokter (`CRUD Penuh`), Kasir Klinik (`R Billing Obat & Tindakan`), Owner Klinik (`R Agregat Medis`), Member/Pasien (`R Jadwal & Resep Pribadi`).

### FITUR 18: RESERVASI & ANTREAN RUANG TUNGGU
* **Kode Modul**: `F18` | **Kategori**: Manajemen Antrean & Tamu
* **Deskripsi**: Pengelolaan buku reservasi meja makan atau nomor antrean pemeriksaan klinik, estimasi waktu panggil, dan notifikasi WhatsApp Hermes saat giliran tiba.
* **Akses**: Superadmin (`CRUD`), Owner (`CRUD`), GM (`CRUD`), Kasir/Staf (`CRUD`), Dokter (`RU`), Member (`CRUD Reservasi Milik Sendiri`).

### FITUR 19: PENGAJUAN HARUM.IN CAPITAL & PAYOUT
* **Kode Modul**: `F19` | **Kategori**: Layanan Finansial
* **Deskripsi**: Fasilitas pengajuan pembiayaan modal usaha berdasarkan rekam jejak omzet kasir POS, serta pengaturan rekening pencairan otomatis (*automated payout*).
* **Akses**: Owner (`CRUD`), GM (`RU`), Superadmin (`CRUD`), Staf (`-`).

### FITUR 20: PENGADAAN BAHAN HARUM.IN SUPPLIES
* **Kode Modul**: `F20` | **Kategori**: B2B Marketplace Bahan Baku
* **Deskripsi**: Marketplace pengadaan bahan baku grosir (biji kopi, susu, kemasan, cup, alkes klinik) langsung dari jaringan distributor resmi Harum.in dengan harga pabrik.
* **Akses**: GM (`CRUD`), Owner (`Approval`), Superadmin (`CRUD`), Staf (`-`).

---

## 5. INTEGRITAS SCRIPT, UPGRADE TERBARU & PEMELIHARAAN LOGIKA

Seluruh pembaruan sistem dieksekusi dengan prinsip **Zero Regression** (tidak merusak skrip atau logika yang telah berjalan sebelumnya):

### 1. Perbaikan Desain UI/UX Live Search Riwayat Analisis Copilot
- **Masalah Sebelumnya**: Kotak input pencarian di panel *"Riwayat Analisis Bisnis"* terpotong atau tertimpa bagian bawahnya oleh *table header* (`WAKTU & BIAYA | PERTANYAAN OWNER ...`).
- **Penyebab Akar (Root Cause)**: Di `src/styles/dashboard.css`, selector `.d-table-wrap` memiliki margin negatif `margin: calc(var(--space-md) * -1)` untuk kebutuhan tabel menempel dinding panel. Saat diletakkan di bawah input pencarian, tabel ditarik ke atas sebesar 20px sehingga menindih input box.
- **Solusi Paripurna**:
  1. Menambahkan modifier `.d-table-wrap--contained { margin: 0 !important; }` di `src/styles/dashboard.css`.
  2. Memperbarui `src/app/pages/growth/Copilot.jsx`: memberikan `margin: "0"` eksplisit dan menyematkan ikon pencarian SVG elegan dengan container toolbar fleksibel dan indikator hasil live filter.

### 2. Standar Kuota Token AI Owner Copilot (1 Tanya = 1 Kuota)
- **Logika Pemotongan**: 1 pengiriman pertanyaan berhasil = memotong tepat **1 token kuota** (bukan berdasarkan jumlah token kata LLM).
- **Skema Kuota**:
  - Kuota awal diberikan saat pendaftaran tenant sesuai paket (misal 500 tanya/bulan).
  - Reset otomatis setiap siklus perpanjangan bulanan.
  - Superadmin dapat menambah/mereset kuota tenant sewaktu-waktu melalui RPC `set_ai_quota`.

### 3. Integrasi Pembayaran QRIS Dinamis Pakasir
- Engine pembayaran QRIS terhubung langsung ke API Pakasir v2 (`app.pakasir.com/api/v2`).
- Webhook notifikasi status transaksi otomatis memperbarui status pembayaran di tabel POS dan member portal secara instan.

### 4. Status Pengujian & Build
- **Unit Testing**: 7 dari 7 suite pengujian (`npm test`) berstatus **LULUS (100%)**.
- **Production Bundle**: `npm run build` sukses dalam 1.24 detik tanpa peringatan linting.

---
*Dokumen ini merupakan pedoman resmi hak akses (RBAC) dan arsitektur fitur Platform Harum.in.*

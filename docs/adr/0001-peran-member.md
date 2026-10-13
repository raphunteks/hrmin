# ADR-001: Peran Member (L5) dan Isolasi Portal Pelanggan

- **Status:** Disetujui (Accepted)
- **Tanggal:** 2026-10-14
- **Pengambil Keputusan:** Tim Arsitektur Harum.in
- **Terkait:** Tiket 04 (Peran Member), Tiket 05 (Masuk WhatsApp OTP), Tiket 06 (Dashboard Member /m), Migrasi 20–24

---

## 1. Konteks dan Masalah

Harum.in memerlukan portal pelanggan (*loyalty customer portal*) yang memungkinkan pelanggan:
1. Memiliki kartu member digital dengan kode QR untuk dipindai kasir.
2. Memeriksa saldo poin loyalitas, riwayat transaksi, dan mengunduh struk digital.
3. Melakukan reservasi dan pemesanan mandiri (*self-order*).
4. Masuk (*login*) secara praktis tanpa kata sandi via nomor WhatsApp.

Tantangan arsitektural:
- **Keamanan Multi-Tenant & Zero-Trust:** Pelanggan tidak boleh memiliki akses apa pun ke data operasional internal merchant (HPP, resep, stok, jurnal akuntansi, payroll, maupun data pelanggan lain).
- **Integritas Matriks RBAC:** Sistem telah memiliki matriks RBAC 20 fitur × 5 peran internal (Superadmin, Owner, GM, Staff, Dokter) yang teruji ketat. Menambahkan peran baru tidak boleh merusak atau mengubah hak akses peran internal yang sudah ada.
- **Kepatuhan Privasi (UU Pelindungan Data Pribadi / PDP):** Persetujuan pemrosesan data layanan wajib dipisahkan dari persetujuan pemasaran. Pelanggan berhak mengunduh data pribadi dan meminta penghapusan akun.

---

## 2. Keputusan Arsitektural

### 2.1 Peran L5 dengan Akses "Milik Sendiri"
- Menetapkan peran **`member`** sebagai peran tingkat **L5** (level terendah).
- Matriks inti 20 fitur internal tidak diubah. Hak akses Member dikelola melalui `MEMBER_ACCESS` di JS (`src/lib/rbac-matrix.js`) dan dicerminkan pada tabel `rbac_matrix` lewat migrasi `20261011000021_rbac_member_seed.sql`.
- Member tidak pernah menerima izin persetujuan (*Approval*), pengajuan (*Request*), maupun akses fitur Konfigurasi, Laporan, Keuangan, dan Penggajian.

### 2.2 Isolasi Ketat di Basis Data via Row-Level Security (RLS)
- Isolasi ditegakkan langsung di PostgreSQL melalui kebijakan RLS (migrasi `20261011000022_member_isolation.sql`), bukan di level aplikasi/frontend.
- Fungsi pembantu `public._member_customer_id()` mengunci konteks Member sehingga hanya baris tabel `customers`, `orders`, `order_items`, dan `payments` dengan nomor telepon atau ID pelanggan miliknya yang dapat dibaca.
- Member dilarang menulis langsung (*insert/update/delete*) ke tabel operasional; semua mutasi data dilakukan melalui *Stored Procedure* / RPC terverifikasi.

### 2.3 Autentikasi WhatsApp OTP & Penautan Otomatis
- Masuk menggunakan Kode Masuk sekali pakai (*OTP*) yang dikirim melalui WhatsApp (Hermes Webhook) dengan fallback simulasi pada lingkungan dev (`MEMBER_OTP_SIMULATE=1`).
- Kode OTP kedaluwarsa dalam 5 menit, dengan batas percobaan salah maksimal 5 kali (setelah itu terkunci).
- Batas laju (*rate limiting*) dipasang berlapis: 3 permintaan per 15 menit per nomor telepon, dan 10 permintaan per jam per perangkat (*device ID*).
- Setelah nomor telepon terverifikasi, akun Member otomatis ditautkan ke data `customers` yang sudah ada, sehingga riwayat dan akumulasi poin sebelumnya langsung tersambung.
- Persetujuan data (*consent*) dicatat terpisah: persetujuan pemrosesan data (wajib) dan persetujuan pemasaran WhatsApp (opsional).

### 2.4 Kartu Member QR Dinamis (Anti-Screenshot)
- Kartu member menggunakan token QR berumur pendek (*short-lived token* 90 detik) yang ditandatangani dengan kunci rahasia HMAC di basis data (`member_card_keys`).
- Kasir memvalidasi token melalui RPC `resolve_member_card`. Tangkapan layar (*screenshot*) yang berumur lebih dari 90 detik otomatis ditolak sistem untuk mencegah pencurian poin.

### 2.5 Cangkang Portal Terpisah & Kustomisasi Tema (`tenant_branding`)
- Portal member diakses di rute `/m` menggunakan cangkang mandiri `MemberShell` (ringan, mobile-first, tanpa menu sidebar operasional).
- Tema warna dan identitas visual mengikuti tabel `public.tenant_branding` (`accent_color`, `logo_url`, `display_name`, `welcome_text`).
- Akses ke dashboard member dibatasi per Paket langganan via Saklar Fitur (*Feature Flag*) `member_dashboard`.
- Owner dapat mengatur merek dan tema melalui antarmuka *Policy Builder* di menu Layanan & Akses.

### 2.6 Hak Privasi UU PDP (Unduh Data & Hapus Akun)
- RPC `member_export` menyediakan ekspor data profil, pesanan, dan persetujuan dalam format terstruktur.
- RPC `member_delete_account` menghapus profil Member dan data identitas pelanggan, dengan tetap mempertahankan data transaksi pesanan secara anonim demi integritas pelaporan keuangan dan pembukuan merchant.

---

## 3. Konsekuensi

### Positif:
- **Zero Trust:** Pelanggan yang login tidak dapat mengintip data toko lain maupun data operasional internal merchant.
- **Non-Destruktif:** Tidak ada perubahan pada alur kasir, GM, atau Owner yang sudah berjalan.
- **Kepatuhan Regulasi:** Memenuhi standar UU PDP Indonesia untuk penanganan data konsumen.
- **Performa Ringan:** Frontend `/m` terisolasi dan tidak membebani bundel aplikasi operasional kasir/ERP.

### Batasan & Hal yang Perlu Diperhatikan:
- Memerlukan konfigurasi webhook Hermes aktif (`HERMES_WEBHOOK_URL`) di produksi agar OTP WhatsApp terkirim secara nyata.
- Perubahan kebijakan jam operasional atau shift lock harus tetap menghormati konteks pengujian lokal tanpa bergantung pada jam eksekusi sistem.

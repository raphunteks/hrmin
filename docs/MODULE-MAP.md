# Peta Modul HARUM.IN

Pemetaan modul, interface, dan seam, memakai kosakata *deep module* (Module, Interface, Seam, Adapter, Depth, Leverage, Locality). Istilah bisnis ada di [GLOSSARY.md](../GLOSSARY.md).

Dasar pemetaan: README, `src/` (routing, API, lib, auth), semua Edge Function, dan migrasi 1–8, 10–12, 15–17, 19 (daftar fungsi dan tabel; isi lengkap hanya migrasi 1, 5, 7). Migrasi 4, 9, 13, 14, 18, halaman UI, dan adapter demo belum dibaca baris per baris.

## 1. Seam utama

| Seam | Adapter | Status |
|---|---|---|
| **Data** (`api/index.js`: `loadApi()`) | Supabase (`api/supabase.js`) dan demo (`api/demo*.js`) | **Nyata**: dua adapter |
| **Hak akses** (Matriks RBAC) | UI `can()`/`permOf()` dan database `has_perm()`/RLS | **Nyata**: dua adapter dari satu matriks |
| **Identitas fungsi Edge** (`_shared/auth.ts`) | `userContext` (RLS berlaku) dan `admin` (service role) | **Nyata**: dua peran yang berbeda |
| **Gateway AI** (9router) | satu: 9router | **Hipotetis**: baru satu adapter |
| **Pengiriman pesan** (Hermes) | satu: webhook Hermes (plus mode simulasi) | **Hipotetis** |
| **SATUSEHAT** | nyata dan simulasi | Nyata, tapi adapter nyata belum teruji ke sandbox |

Aturan yang dipakai: satu adapter berarti seam hipotetis, dua adapter berarti seam nyata. Jangan membuat seam baru sebelum ada yang bervariasi di baliknya.

## 2. Modul bisnis

| Modul | Isi | Lokasi utama | Interface (yang harus diketahui pemanggil) | Kedalaman |
|---|---|---|---|---|
| **Akses & Identitas** | Peran, Matriks RBAC, PIN, Undangan, status akun | `lib/rbac*.js`, `auth/`, migrasi 2, 4, 11, 12 | `can(role, fitur, aksi)`, `permOf`; di DB `has_perm`, `perm_scope`, `tenant_ok`, `branch_ok` | **Dalam** pada matriks; **dangkal** pada guard halaman (lihat 3.3) |
| **Platform** | Tenant, Paket, Tagihan Langganan, Saklar Fitur, Reseller, Tiket | `pages/superadmin`, `pages/service`, migrasi 11, 17 | RPC `create_tenant_with_owner`, `generate_invoices`, `run_dunning`, `set_feature_flag`, dan lain-lain | Dalam (logika di SQL) |
| **Penjualan** | Pesanan, Pembayaran, Sesi Kas, Void, Promo, Meja, Dapur | `pages/ops/Pos.jsx`, `Payment.jsx`, `Kitchen.jsx`, migrasi 5, 6, 10, 16 | `create_order`, `pay_order`, `request_void`, `move_order`, `open_shift`, `close_shift` | **Dalam**, tapi tidak lokal (lihat 3.2) |
| **Persediaan** | Bahan, Resep, Stok, Opname, Transfer, PO, Pemasok | `pages/ops/Stock|Recipes|Purchasing|Transfers|Opname`, migrasi 5, 6 | `submit_opname`, `apply_opname`, `create_sto`, `advance_sto`, `submit_po`, `receive_po`, `produce_semi` | Dalam |
| **Keuangan** | Akun, Jurnal, Neraca, Kas Kecil, Capital | `pages/ops/Journal|Balance|Cash`, `pages/owner/Capital`, migrasi 3, 6, 15 | `post_manual_journal`, `balance_sheet`, `cash_flow`, `validate_petty`, `decide_capital` | Dalam |
| **Tenaga Kerja** | Absensi, Jadwal Kerja, Tukar Jadwal, Payroll, Kasbon | `pages/ops/Attendance|Payroll|Staff`, `growth/Swaps`, migrasi 6, 15, 19 | `clock`, `correct_attendance`, `create_payroll_run`, `request_swap`, `grant_loan` | Dalam |
| **Klinik** | Antrean, Kunjungan, rekam medis, E-Resep, SATUSEHAT | `pages/clinic/`, `lib/clinic.js`, `lib/icd.js`, migrasi 7, 8, `satusehat-sync` | `start_visit`, `close_visit`, `retry_satusehat` | Dalam |
| **Wawasan** | Dashboard, KPI, Menu Engineering, Proyeksi, Copilot, Anomali | `pages/owner`, `pages/growth`, `lib/watch.js`, migrasi 3, 16 | `dashboard_daily`, `branch_kpi`, `menu_engineering`, `copilot_snapshot` | Dalam |
| **Integrasi** | Hermes, 9router, SATUSEHAT, penagihan otomatis | `supabase/functions/*` | Edge Function per layanan | Campuran (lihat 3.4) |

## 3. Temuan desain

### 3.1 Antarmuka data terlalu lebar dan bocor ke halaman

`api/supabase.js` punya sekitar 40 metode bernama, ditambah `list/insert/update/remove/rpc` generik. Halaman memakai yang generik: `Pos.jsx` memanggil `api.list("tables")`, `list("products")`, `list("orders")`, `list("shifts")`, `list("order_items")` lalu menyambungnya di klien. Akibatnya:

- Nama tabel dan bentuk filter RLS menjadi bagian dari interface yang harus diketahui setiap halaman.
- Adapter demo harus meniru tabel mentah, bukan niat.
- **Deletion test**: hapus `api.list` dan kompleksitas muncul kembali di puluhan halaman, jadi ia berguna, tetapi ia modul dangkal (antarmuka hampir sebesar implementasinya: nama tabel dan filter apa saja).

**Arah**: tulis bacaan per layar sebagai RPC niat, mis. `floor_snapshot(branch)` yang mengembalikan meja, Pesanan terbuka, Item Pesanan, dan shift sekaligus. Tulisan sudah mengikuti pola ini (`create_order`, `pay_order`). Halaman jadi lebih tipis dan kedua adapter punya kontrak kecil yang sama.

### 3.2 Modul Penjualan dalam tetapi tidak lokal

Dari migrasi yang saya periksa, fungsi inti didefinisikan ulang di beberapa berkas, dan yang berlaku adalah definisi terakhir:

| Fungsi | Didefinisikan di migrasi |
|---|---|
| `pay_order` | 6, 8, 10, 16 (README juga menyebut 13 dan 14) |
| `decide_approval` | 3, 6, 12, 15 |
| `dashboard_daily` | 3, 6, 10 |
| `create_payroll_run` | 6, 8, 15 |
| `open_shift`, `validate_petty`, `clock` | 6 dan 15 |
| `cash_projection`, `copilot_snapshot` | 16 dan 17 |

Untuk memahami `pay_order` hari ini, pembaca harus menelusuri empat sampai enam berkas. README sendiri mencatat migrasi 14 memperbaiki migrasi 13 (kolom hilang, pajak dan CRM hilang dari `pay_order`), tanda klasik bahwa perubahan bertumpuk tanpa titik kebenaran tunggal.

**Arah**:
- Simpan satu sumber per fungsi (mis. `supabase/sql/<modul>/<fungsi>.sql`) dan hasilkan migrasi dari sana, atau lakukan *squash* berkala ke satu definisi kanonik.
- Uji lewat interface (RPC), bukan lewat membaca SQL. `supabase/tests/fase1.py` sudah memulainya; perluas ke `pay_order`, void, opname, dan payroll.

### 3.3 Hak akses: matriks dalam, guard halaman bocor

- Matriks adalah modul yang baik: satu sumber (`rbac-matrix.js`), dipakai UI dan di-seed ke SQL. Dua adapter, seam nyata.
- Risiko drift: komentar dulu menyebut `scripts/gen-rbac-sql.mjs` (tidak ada); sudah dikoreksi ke `scripts/gen-seed.mjs`. Kesamaan JS dan seed migrasi 4 kini dibuktikan oleh `tests/rbac-contract.test.mjs`.
- `pages.js` mencampur `can(...)` dengan pengecekan peran langsung: `r === "owner"`, `r !== "dokter"`, `["staff","dokter","gm","owner"].includes(r)`, `r === "superadmin"`. Aturan ini tidak melewati matriks, jadi Interface hak akses sebenarnya lebih lebar dari yang tampak.

**Arah**:
- Tambah satu tes yang membandingkan `MATRIX` dengan isi tabel `rbac_matrix` di database.
- Pindahkan pengecekan peran langsung ke Fitur baru atau Cakupan pada matriks, atau beri nama (`isPlatform(r)`, `canTenantAdmin(r)`) di satu tempat.

### 3.4 Integrasi: duplikasi nyata, seam hipotetis

- `hermes-dispatch` menangani tiga jalur masuk (webhook, cron, pesan manual) **dan** menjalankan `run_due_reports`, `generate_invoices`, `run_dunning`, `refresh_benchmark` tiap menit. Namanya menyembunyikan penagihan; ini kecil di antarmuka tetapi membingungkan bagi pembaca. Pisahkan penjadwal (`scheduler`) dari pengirim pesan.
- `ai-gateway` dan `owner-copilot` sama-sama memanggil 9router: baca pengaturan, cek kuota, `fetch`, catat pemakaian. Dua salinan. Ekstrak satu modul bersama (mis. `_shared/llm.ts`) untuk menghilangkan duplikasi, **tanpa** menambah abstraksi penyedia sampai ada penyedia kedua.
- Perbedaan perilaku kecil yang rawan: `ai-gateway` tidak membatasi peran dan memanggil `rateLimit` tanpa `try/catch`, sedangkan `owner-copilot` membatasi ke Owner dan toleran bila Upstash mati.

### 3.5 Adapter demo: seam nyata dengan biaya ganda

Adapter demo ±214 KB (`demo.js` 35 KB, `demoAccess.js` 32 KB, `demoClinic.js` 26 KB, `demoGrowth.js` 54 KB, `demoOps.js` 68 KB) meniru RPC dalam JavaScript. Seam benar-benar nyata (dua adapter), tetapi setiap aturan bisnis ada dua kali dan bisa menyimpang.

**Arah**: satu set skenario kontrak (buat Pesanan, bayar dengan voucher, void ber-PIN, opname, tukar shift) yang dijalankan terhadap **kedua** adapter. Bila tak ingin menjaga demo penuh, kurangi cakupannya ke alur yang dipakai untuk presentasi.

### 3.6 Model data

- `purchase_orders.lines` dan `stock_transfers.lines` berupa JSONB `[{item_id, qty}]`: tanpa kunci asing ke Bahan, sehingga integritas dan pelaporan per Bahan lebih sulit.
- `Pillar` di database mencakup `fnb`, `retail`, `service`, `health`, `mfg`, `omni`, tetapi halaman hanya membedakan `health` dan non-`health`. Tiga Pillar lain belum punya perilaku sendiri.
- `Modul Paket` (M1–M12 pada Paket) dan `Fitur` (F1–F20 pada matriks) adalah dua penomoran; pemetaan antara keduanya tidak ada di kode yang saya baca.

## 4. Konflik istilah yang ditemukan, dan keputusan di GLOSSARY.md

| Pemakaian di kode atau UI | Keputusan |
|---|---|
| Merchant, Owner Merchant, Tenant | **Tenant** (bisnis) dan **Owner** (peran) |
| Staff, Staf, Kasir, Cashier | **Staff**: satu peran yang sama; Kasir hanya sebutan sehari-hari |
| Order, Pesanan, Nota, Transaksi | **Pesanan**; Struk adalah buktinya; Pembayaran adalah uangnya |
| Tagihan (platform) dan Tagihan (klinik) | **Tagihan Langganan** vs **Pembayaran Pasien** |
| Shift (sesi kas) dan shift (jadwal, tukar shift) | **Sesi Kas** vs **Jadwal Kerja** (dan Tukar Jadwal) |
| Modul (paket M1–M12) dan Fitur (matriks F1–F20) | Dipisah: **Modul Paket** vs **Fitur** |
| Item (Bahan) dan item (baris pesanan) | **Bahan** vs **Item Pesanan** |
| Pelanggan dan Pasien | Dua istilah berbeda; jangan dicampur |
| Supervisor (narasi Bab V) dan GM | **GM**; matriks asli yang berlaku |
| Resep (takaran Bahan) dan Resep (obat) | **Resep** vs **E-Resep** |

## 5. Urutan pengerjaan yang disarankan

1. Tambah tes kontrak: `MATRIX` vs `rbac_matrix`, dan skenario Penjualan lewat RPC terhadap adapter Supabase dan demo.
2. Konsolidasikan definisi kanonik `pay_order`, `decide_approval`, `dashboard_daily`.
3. Ganti pembacaan tabel mentah di halaman Penjualan dengan satu RPC bacaan per layar.
4. Rapikan guard di `pages.js` dan ekstrak `_shared/llm.ts`.
5. Pisahkan penjadwal dari `hermes-dispatch`.

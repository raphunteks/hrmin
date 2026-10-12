# Dashboard Member (draf rancangan)

Status: **draf; Q13–Q18 disetujui** (2026-10-14). Keputusan yang sudah diambil: Member adalah **peran baru L5** di Matriks RBAC (menggantikan rekomendasi "tanpa peran baru" pada Q12). Istilah ada di [GLOSSARY.md](../GLOSSARY.md).

## 1. Prinsip

1. Member hanya bertindak atas **data miliknya sendiri** (Cakupan "milik sendiri"). Ia tidak pernah melihat data operasional Tenant: stok, HPP, resep, jurnal, karyawan, Pelanggan lain.
2. Satu akun Member terikat ke **satu Tenant** (diusulkan, Q14).
3. Dashboard Member memakai **cangkang tampilan terpisah** dari `AppShell` (ringan, mobile-first, tema Tenant), bukan menu sidebar operasional.
4. Setiap kemampuan menempel ke satu nomor Fitur yang sudah ada, dengan Aksi dan Cakupan yang jelas, supaya RLS yang menegakkan, bukan UI.

## 2. Usulan kolom Member pada Matriks RBAC

| No | Fitur | Member | Cakupan (usulan) | Catatan |
|---|---|---|---|---|
| 1 | Konfigurasi Tenant, 9router, Hermes | - | | |
| 2 | Dashboard Eksekutif | - | | |
| 3 | Produk, Varian, Harga, Promo | R | katalog publik | Menu, harga, promo yang berlaku; tanpa HPP |
| 4 | Resep dan BOM | - | | HPP rahasia |
| 5 | POS dan Struk | R | pesanan sendiri | Riwayat Pesanan dan Struk digital |
| 6 | Void, Refund, Diskon | - | | Refund tetap lewat Staff di v1 |
| 7 | Denah, Kiosk, QR E-Menu | Create | pesanan sendiri | Memesan lewat menu digital |
| 8 | Antrean Dapur | R | status pesanan sendiri | Melacak "dimasak / siap" |
| 9–14 | PO, stok, akuntansi, kas, karyawan, payroll | - | | |
| 15 | CRM dan Poin | RU | data pribadi | Lihat poin dan tingkat; ubah profil dan preferensi |
| 16 | Omnichannel | - | | |
| 17 | Rekam Medis | R | jadwal, e-resep, tagihan pribadi | Hanya bila Q16 disetujui; SOAP dan odontogram tertutup |
| 18 | Reservasi dan Antrean | CRUD | milik sendiri | Booking meja atau janji klinik; ubah dan batalkan |
| 19–20 | Capital, Supplies | - | | |

Dampak teknis pada kode (belum dikerjakan):
- Tambah `member` di daftar peran, label peran, dan tingkat L5 pada `rbac-matrix.js`, serta nilai baru pada jenis peran di database.
- Tambah label Aksi dan Cakupan baru pada `parseLabel` (mis. "R (Pesanan Pribadi)", "Create (Pesanan Sendiri)", "CRUD (Milik Sendiri)").
- Hubungkan profil Member ke satu Pelanggan (dan satu Pasien bila ada) agar RLS bisa menyaring baris milik sendiri.
- Seed ulang `rbac_matrix`, perbarui kebijakan RLS pada tabel yang terkait, lalu perluas audit RLS (`db:audit`) dengan akun demo Member.
- Tambah akun demo Member pada mode demo dan adapter demo.
- Alur masuk khusus Member (Q13), terpisah dari login karyawan.

## 3. Fitur dashboard Member

### Versi 1 (inti)
| Fitur | Fitur matriks | Isi |
|---|---|---|
| Beranda | F15 | Poin, tingkat, voucher aktif, kunjungan terakhir, pengingat berikutnya |
| Kartu member digital | F15 | QR untuk dipindai Staff saat transaksi |
| Riwayat Pesanan dan Struk | F5 | Daftar, rincian, unduh Struk |
| Pesan sendiri dan pesan ulang | F7, F8 | Menu digital, keranjang, catatan, pelacakan status dapur (bayar di kasir) |
| Reservasi | F18 | Booking meja atau janji klinik, ubah, batalkan |
| Dompet voucher dan tukar poin | F15, F3 | Voucher yang dimiliki, promo berlaku, tukar poin |
| Profil dan preferensi | F15 | Nama, nomor WhatsApp, alergi atau catatan, persetujuan komunikasi |
| Privasi data | F15 | Kelola persetujuan, unduh data, minta hapus akun (Q18) |

### Versi 2
| Fitur | Fitur matriks | Isi |
|---|---|---|
| Survei dan ulasan | F15 | Penilaian setelah Pesanan atau Kunjungan |
| Notifikasi WhatsApp | F15, F18 | Pengingat reservasi dan kontrol, info promo (sesuai persetujuan) |
| Pembayaran QRIS dari dashboard | F5 | Bayar Pesanan sendiri lewat QRIS dinamis |
| Tingkat loyalitas dan misi | F15 | Tingkat, lencana, target belanja |
| Referral | F15 | Ajak teman, hadiah poin |

### Versi 3 (khusus klinik, bila Q16 disetujui)
| Fitur | Fitur matriks | Isi |
|---|---|---|
| Jadwal kontrol dan pengingat | F17, F18 | Jadwal berikutnya dari Dokter |
| E-Resep saya | F17 | Daftar obat dan Signa |
| Tagihan dan estimasi biaya rencana perawatan | F17, F5 | Ringkasan biaya, bukan isi klinis |
| Persetujuan tindakan digital | F17 | Menandatangani persetujuan yang disiapkan Dokter |

## 4. Keputusan yang sudah diambil

| No | Keputusan |
|---|---|
| Q13 | Member masuk dengan Kode Masuk sekali pakai lewat WhatsApp, tanpa kata sandi, terpisah dari login karyawan. |
| Q14 | Satu akun Member terikat ke satu Tenant; orang yang sama di Tenant lain punya akun terpisah. |
| Q15 | Akun Member otomatis tertaut ke data Pelanggan dengan nomor telepon yang sama setelah Kode Masuk terverifikasi; poin lama ikut. |
| Q16 | Member yang juga Pasien boleh melihat jadwal kontrol, e-resep, dan tagihan sendiri; SOAP, diagnosis, dan odontogram tertutup. Hak pasien atas rekam medis lengkap perlu dicek ke aturan resmi sebelum diperluas. |
| Q17 | Versi 1 hanya memesan dan melacak status; bayar di kasir. Bayar QRIS dari dashboard masuk versi 2. |
| Q18 | Pendaftaran meminta Persetujuan Data terpisah (pengolahan data wajib, pemasaran WhatsApp opsional); dashboard menyediakan unduh data dan hapus akun. |

## 5. Risiko yang perlu dijaga

- **Kebocoran antar Member.** Semua kebijakan "milik sendiri" harus diuji dengan dua Member berbeda pada Tenant yang sama dan pada Tenant berbeda.
- **Penyalahgunaan nomor telepon.** Penautan ke Pelanggan lama harus lewat verifikasi nomor (kode sekali pakai), supaya orang tidak mengambil poin orang lain.
- **Data kesehatan.** Data pribadi spesifik menurut UU PDP; tampilkan seminimal mungkin pada v3 dan periksa aturan hak pasien atas rekam medis sebelum menambah isi.
- **Beban rate limit.** Endpoint publik Member (pesan, masuk) perlu pembatasan laju per nomor dan per perangkat, karena tidak seperti karyawan, penggunanya tidak dikenal.

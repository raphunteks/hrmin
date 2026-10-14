# Pilot Member di Kopi Harum (tiket 08)

Tujuan: menjalankan alur Member dari awal sampai akhir di Tenant Kopi Harum sebelum dibuka ke Tenant lain.

## Prasyarat
1. Migrasi 24–28 sudah terpasang (`npm run db:migrate`).
2. Fungsi `member-auth` sudah di-deploy dan penyedia pesan WhatsApp (Hermes) terhubung.
3. Flag `member_dashboard` aktif untuk Kopi Harum (Paket Growth atau Enterprise, atau override per Tenant).
4. Opsional: flag `qris_dynamic` (QRIS dinamis, perlu secret Midtrans) dan `online_orders` (pesanan online).

## Alur yang diuji (lulus pada uji SQL lokal)
- Dua Member mendaftar dengan Kode Masuk WhatsApp; Pelanggan lama tertaut lewat nomor, Pelanggan baru dibuat.
- Member memesan dari menu, Staff melihat di Layar Dapur dengan penanda Member, memproses, lalu membayar di kasir (v1: bayar di kasir).
- Poin naik pada Pelanggan yang benar; Member lain tidak terpengaruh.
- Reservasi meja dibuat, diubah, dibatalkan; batas laju bekerja.
- Member mengunduh datanya (hanya miliknya) dan menghapus akun; jejak Pesanan dilepas dari Pelanggan.
- Tenant Starter ditolak (Saklar Fitur Paket).

## Temuan dan tindak lanjut
| # | Temuan | Dampak | Usul |
|---|--------|--------|------|
| 1 | Pesanan Member yang terbuka tidak kedaluwarsa otomatis | Sedang: pesanan lupa dibayar menahan jatah 3 pesanan terbuka Member | Sweep terjadwal membatalkan pesanan Member terbuka > N jam tanpa item dimasak |
| 2 | `table_label` adalah teks bebas dan tidak memperbarui denah meja | Rendah: meja tetap tampak kosong | Pilih meja dari daftar bila Tenant memakai denah |
| 3 | Tidak ada notifikasi WhatsApp "pesanan siap" ke Member, atau pesanan baru ke Staff | Sedang: Member harus membuka aplikasi | Tambah pesan via Hermes setelah ada template yang disetujui |
| 4 | Stok dipotong saat bayar, bukan saat pesan | Rendah: menu bisa dipesan lalu habis sebelum dibayar | Dipertahankan; ketersediaan dicek saat pesan, Produk 86 ditolak |

## Cara memulai pilot
1. Aktifkan flag untuk Kopi Harum saja; undang 3–5 pelanggan setia.
2. Pantau 7 hari: jumlah pesanan Member, pesanan terbatalkan, pesan error di log Edge Function.
3. Keputusan lanjut/tidak setelah 7 hari berdasarkan temuan 1 dan 3 di atas.

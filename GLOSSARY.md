# Harum.in

Platform POS/ERP multi-tenant untuk usaha F&B, retail, jasa, dan klinik. Satu **Platform** melayani banyak **Tenant**; tiap Tenant menjalankan operasinya sendiri lewat **Cabang**, dengan akses dibatasi oleh **Peran** menurut **Matriks RBAC**.

Peta modul, seam, dan temuan desain ada di [docs/MODULE-MAP.md](./docs/MODULE-MAP.md). Berkas ini hanya berisi bahasa bisnis.

## Language

### Struktur usaha

**Platform**:
Lapisan Harum.in di atas semua Tenant, dikelola Superadmin.
_Avoid_: Sistem pusat, backoffice

**Tenant**:
Satu bisnis pelanggan Harum.in beserta seluruh datanya; batas isolasi data.
_Avoid_: Merchant, Klien, Akun bisnis, Perusahaan

**Pillar**:
Jenis usaha sebuah Tenant (F&B, retail, jasa, kesehatan, manufaktur, omnichannel) yang menentukan halaman apa yang tampil.
_Avoid_: Industri, Tipe bisnis, Vertikal

**Cabang**:
Satu lokasi operasional milik Tenant, dengan titik koordinat dan radius absensi.
_Avoid_: Outlet, Toko, Store

**Gudang**:
Cabang yang ditandai sebagai pusat penyimpanan stok dan tidak berjualan.
_Avoid_: Warehouse cabang, Gudang pusat

**Template Industri**:
Paket pengaturan awal untuk satu Pillar (mis. kafe, toko, salon, klinik gigi) yang diterapkan Owner.
_Avoid_: Preset, Starter

### Peran dan hak akses

**Superadmin** (L0):
Pengelola Platform; tidak terikat ke Tenant mana pun.
_Avoid_: Developer, Admin pusat

**Owner** (L1):
Pemilik Tenant; memutuskan persetujuan besar dan melihat laba riil.
_Avoid_: Pemilik usaha, Merchant

**GM** (L2):
General Manager yang menjalankan satu atau beberapa Cabang dan memegang PIN Otorisasi.
_Avoid_: Supervisor, Manajer, Manager

**Staff** (L3):
Peran karyawan lapangan yang menjalankan penjualan harian di Cabang: melayani pelanggan, menerima bayar, dan menangani dapur atau stok sesuai Matriks RBAC. Kasir adalah Staff yang sedang di mesin penjualan, bukan peran lain.
_Avoid_: Kasir, Staf, Cashier, Karyawan biasa

**Dokter** (L4):
Peran tenaga kesehatan atau terapis yang memeriksa Pasien dan mengisi rekam medis.
_Avoid_: Nakes, Terapis (sebagai peran terpisah)

**Member** (L5):
Peran akun Pelanggan yang login sendiri ke dashboard Member milik satu Tenant; tercakup pada data miliknya saja dan tidak pernah melihat data operasional Tenant.
_Avoid_: Anggota, Pelanggan login, Akun pelanggan, Customer

**Fitur**:
Satu dari 20 kemampuan bernomor (F1–F20) dalam Matriks RBAC.
_Avoid_: Modul (dipakai untuk Modul Paket)

**Matriks RBAC**:
Tabel 20 Fitur × semua Peran yang menyatakan siapa boleh melakukan apa; satu-satunya sumber kebenaran hak akses.
_Avoid_: Daftar izin, Permission list

**Aksi**:
Salah satu kemampuan pada sebuah Fitur: buat, baca, ubah, hapus, setujui, atau minta.
_Avoid_: Izin, Permission

**Cakupan**:
Pembatas yang mempersempit sebuah Aksi ke sebagian data, mis. hanya milik sendiri atau hanya opname dan waste.
_Avoid_: Scope, Filter akses

**Persetujuan**:
Keputusan Owner atau GM atas sebuah Permintaan (void, PO, transfer stok, payroll, pengadaan).
_Avoid_: Approval

**Permintaan**:
Pengajuan oleh peran yang tidak berwenang memutuskan, menunggu Persetujuan.
_Avoid_: Request, Tiket (tiket dipakai untuk bantuan CS)

**PIN Otorisasi**:
Kode rahasia GM yang dimasukkan untuk mengesahkan Void, Refund, dan diskon di atas batas.
_Avoid_: Kode supervisor, Password otorisasi

**Kebijakan Berjenjang**:
Aturan batas diskon, batas void, jam kerja, dan radius absensi yang bisa ditetapkan pada tingkat Tenant, Cabang, atau Peran; yang paling spesifik menang.
_Avoid_: Policy, Pengaturan

**Undangan**:
Ajakan bergabung ke Tenant yang dikirim ke email calon anggota dengan Peran tertentu.
_Avoid_: Invite

**Sesi Dukungan**:
Akses sementara Superadmin ke data satu Tenant untuk menangani masalah, yang hanya aktif setelah Owner mengizinkan.
_Avoid_: Break-glass, Akses darurat

**Jejak Audit**:
Catatan permanen siapa melakukan apa dan kapan atas data penting.
_Avoid_: Log aktivitas, Audit trail

### Langganan dan penagihan Platform

**Paket**:
Penawaran harga bulanan dengan batas jumlah Cabang dan daftar Modul Paket.
_Avoid_: Plan, Tier

**Modul Paket**:
Kelompok kemampuan bernomor M1–M12 yang dijual dalam sebuah Paket.
_Avoid_: Fitur (dipakai untuk Matriks RBAC)

**Langganan**:
Hubungan sebuah Tenant dengan sebuah Paket selama periode berjalan; statusnya percobaan, aktif, telat bayar, atau ditangguhkan.
_Avoid_: Akun berlangganan

**Tagihan Langganan**:
Permintaan bayar dari Harum.in kepada Tenant untuk satu periode Langganan.
_Avoid_: Faktur, Invoice, Tagihan (kosong; Tagihan di klinik berarti Pembayaran Pasien)

**Penagihan Bertahap**:
Urutan pengingat, status telat bayar, dan akhirnya Penangguhan bagi Tagihan Langganan yang lewat jatuh tempo.
_Avoid_: Dunning

**Penangguhan**:
Penghentian akses Tenant karena tagihan atau keputusan Superadmin; data tetap tersimpan.
_Avoid_: Blokir, Suspend

**Saklar Fitur**:
Pengaktif kemampuan tertentu per Paket atau per Tenant.
_Avoid_: Feature flag, Toggle

**Reseller**:
Mitra penjual Harum.in yang mendapat komisi dari Tenant yang dibawanya; dikelola Superadmin.
_Avoid_: Agen, Distributor

**Tiket Bantuan**:
Laporan masalah dari Tenant ke tim layanan Harum.in, dengan batas waktu respons pertama.
_Avoid_: Ticket, Komplain

**Skor Kesehatan Tenant**:
Nilai 0–100 yang merangkum keaktifan Owner, transaksi terkini, tagihan tertunggak, dan tiket terbuka.
_Avoid_: Health score

**Tolok Ukur Anonim**:
Perbandingan kinerja Tenant dengan kelompok sejenis, hanya bagi yang memilih ikut dan dengan syarat jumlah kelompok minimum.
_Avoid_: Benchmark

### Penjualan

**Produk**:
Sesuatu yang dijual dengan harga: hidangan, barang, jasa, tindakan medis, atau obat.
_Avoid_: Menu (hanya untuk tampilan F&B), SKU, Barang

**Pesanan**:
Permintaan pembelian satu pelanggan di satu Cabang yang berjalan dari terbuka sampai lunas, void, atau refund.
_Avoid_: Transaksi (ambigu: pesanan, pembayaran, atau jurnal), Nota, Bill, Order

**Item Pesanan**:
Satu baris Produk dengan jumlah, harga saat dijual, dan Stasiun yang mengerjakannya.
_Avoid_: Line item, Detail pesanan

**Kanal**:
Cara Pesanan masuk, mis. makan di tempat atau bawa pulang.
_Avoid_: Channel, Tipe pesanan

**Pembayaran**:
Pelunasan sebagian atau seluruh Pesanan dengan satu metode (tunai, kartu, QRIS, e-wallet, transfer); satu Pesanan bisa punya beberapa.
_Avoid_: Transaksi, Payment

**Struk**:
Bukti Pesanan lunas yang diberikan ke pelanggan, tercetak atau lewat WhatsApp.
_Avoid_: Nota, Receipt

**Void**:
Pembatalan Pesanan yang sudah dikirim, diajukan Staff dan sah setelah Persetujuan GM dengan PIN Otorisasi; di atas nilai tertentu naik ke Owner.
_Avoid_: Batal, Hapus nota

**Refund**:
Pengembalian uang atas Pesanan yang sudah lunas.
_Avoid_: Retur uang

**Diskon**:
Pengurangan harga Pesanan; di atas batas Kebijakan Berjenjang perlu PIN Otorisasi.
_Avoid_: Potongan

**Promo**:
Aturan potongan harga otomatis dengan syarat dan masa berlaku.
_Avoid_: Campaign, Penawaran

**Voucher**:
Kode sekali atau terbatas pakai yang menerapkan sebuah Promo pada Pesanan.
_Avoid_: Kupon

**Sesi Kas**:
Satu sesi kas seorang Staff dari buka dengan modal awal sampai tutup dengan hitung uang; menghasilkan selisih.
_Avoid_: Shift, Shift Kasir, Laci

**Laporan Z**:
Ringkasan penjualan dan kas satu Sesi Kas yang dikeluarkan saat tutup.
_Avoid_: Z-Report, Laporan tutup

**Selisih Kas**:
Beda antara uang yang dihitung dan uang yang seharusnya ada pada akhir Sesi Kas.
_Avoid_: Variance, Kurang setor

**Denah Meja**:
Peta Meja satu Cabang beserta status tiap Meja.
_Avoid_: Floor plan, Layout meja

**Meja**:
Tempat duduk bernomor di sebuah Cabang; statusnya kosong, terisi, diproses dapur, direservasi, atau perlu dibersihkan.
_Avoid_: Table

**Kunci Meja**:
Penahanan singkat sebuah Meja saat dibayar supaya tidak diproses dua Staff sekaligus.
_Avoid_: Lock

**Stasiun**:
Tempat pengerjaan sebuah Produk, mis. dapur, barista, grill, pastry, klinik, farmasi.
_Avoid_: Station, Divisi dapur

**Layar Dapur**:
Antrean Item Pesanan per Stasiun yang bergerak dari baru, dimasak, siap, sampai diantar.
_Avoid_: KDS, Kitchen display

**Habis 86**:
Penanda bahwa sebuah Produk tidak bisa dijual sementara karena bahan habis.
_Avoid_: Stok kosong, Sold out

**Pelanggan**:
Pembeli tercatat berdasarkan nomor telepon, dengan poin dan riwayat belanja; bisa ada tanpa akun login.
_Avoid_: Klien, Customer; Pasien (untuk klinik)
**Poin Loyalitas**:
Nilai yang dikumpulkan Pelanggan dari belanja dan ditukar sebagai potongan; hanya berubah lewat Pesanan atau penukaran.
_Avoid_: Reward, Saldo poin

**Pesanan Offline**:
Pesanan yang dicatat saat jaringan putus dan dikirim ulang begitu tersambung; harga dihitung ulang dengan harga terkini.
_Avoid_: Draft offline, Antrean offline

### Persediaan dan pembelian

**Bahan**:
Barang yang stoknya dihitung dan dipakai membuat Produk, termasuk barang setengah jadi.
_Avoid_: Item, Barang, Inventory item, SKU bahan

**Barang Setengah Jadi**:
Bahan yang dibuat sendiri dari Bahan lain lewat Resep dan Produksi.
_Avoid_: Semi, WIP

**Resep**:
Daftar Bahan beserta takaran untuk membuat satu Produk atau Barang Setengah Jadi, bertingkat bila perlu.
_Avoid_: BOM sebagai istilah utama, Formula

**HPP**:
Harga pokok penjualan: biaya Bahan menurut Resep untuk Produk yang terjual.
_Avoid_: COGS, Modal produk

**Stok**:
Jumlah sebuah Bahan yang ada di sebuah Cabang pada saat ini.
_Avoid_: Persediaan (untuk akuntansi), Qty

**Mutasi Stok**:
Satu perubahan jumlah Stok beserta sebabnya: penjualan, waste, opname, transfer, pembelian, produksi, atau pengembalian akibat void.
_Avoid_: Pergerakan stok, Stock movement

**Opname**:
Penghitungan fisik Stok yang selisihnya disahkan GM sebelum Stok disesuaikan.
_Avoid_: Stock count, Cek stok

**Waste**:
Bahan terbuang atau rusak yang dicatat dengan alasan dan nilai biayanya.
_Avoid_: Susut tanpa catatan, Buangan

**Transfer Stok**:
Pemindahan Bahan antar Cabang yang melewati draf, disetujui, dalam perjalanan, dan diterima.
_Avoid_: STO (singkatan saja), Mutasi antar cabang

**Pemasok**:
Pihak luar yang menjual Bahan ke Tenant, dengan termin bayar.
_Avoid_: Vendor, Supplier

**Purchase Order**:
Pesanan pembelian Bahan ke Pemasok, disetujui Owner lalu diterima GM.
_Avoid_: PO sebagai nama utama, Order pembelian

**Harum.in Supplies**:
Layanan pengadaan Bahan lewat Harum.in sendiri, dengan persetujuan Owner.
_Avoid_: Supplies

**Menu Engineering**:
Analisis Produk menurut popularitas dan margin ke dalam empat kelas, memakai metode Kasavana–Smith.
_Avoid_: Analisis menu

### Keuangan

**Akun**:
Pos dalam bagan akun Tenant: aset, kewajiban, ekuitas, pendapatan, HPP, atau beban.
_Avoid_: Rekening (itu rekening bank), COA

**Jurnal**:
Pencatatan akuntansi berpasangan debit dan kredit yang timbul dari Pesanan, pembelian, biaya, gaji, atau input manual.
_Avoid_: Entri, Ledger

**Laba Rugi**:
Laporan pendapatan dikurangi HPP dan beban pada satu periode.
_Avoid_: P&L, Profit loss

**Laba Riil**:
Laba setelah HPP dan beban sebenarnya, yang hanya dilihat Owner.
_Avoid_: Profit bersih (ambigu), Untung kasar

**Neraca**:
Laporan posisi aset, kewajiban, dan ekuitas pada satu tanggal.
_Avoid_: Balance sheet

**Kas Kecil**:
Dana tunai Cabang untuk pengeluaran kecil; tiap pengeluaran wajib berfoto nota dan divalidasi GM.
_Avoid_: Petty cash, Uang receh

**Proyeksi Kas**:
Perkiraan arus kas ke depan dari rata-rata penjualan per hari-dalam-minggu; bukan prediksi pasti.
_Avoid_: Forecast

**Harum.in Capital**:
Layanan pengajuan pembiayaan modal oleh Tenant, diputuskan Superadmin.
_Avoid_: Pinjaman modal, Kredit

**Payout**:
Pencairan dana ke Rekening Payout milik Tenant.
_Avoid_: Penarikan, Withdraw

### Tenaga kerja

**Karyawan**:
Orang yang bekerja untuk Tenant dan punya akun dengan satu Peran.
_Avoid_: Pegawai, Anggota tim (kecuali pada Undangan)

**Jadwal Kerja**:
Jam kerja terencana seorang Karyawan pada satu tanggal di satu Cabang.
_Avoid_: Shift, Roster

**Tukar Jadwal**:
Pertukaran Jadwal Kerja antar dua Karyawan, disetujui rekan lalu GM atau Owner.
_Avoid_: Tukar shift, Swap

**Absensi**:
Catatan masuk dan pulang berdasar lokasi perangkat dan radius Cabang, dengan selfie bila diwajibkan.
_Avoid_: Presensi, Clock-in

**Payroll**:
Proses penggajian satu periode yang diajukan GM dan disahkan Owner.
_Avoid_: Penggajian manual, Gajian

**Komisi**:
Bagian pendapatan yang dibayarkan kepada Dokter atau Karyawan atas penjualan atau tindakannya.
_Avoid_: Bonus, Fee

**Kasbon**:
Pinjaman Karyawan yang dicicil lewat potongan Payroll.
_Avoid_: Utang karyawan, Loan

**Slip Gaji**:
Rincian gaji satu Karyawan untuk satu periode.
_Avoid_: Payslip

**Biaya Tenaga Kerja**:
Perkiraan biaya Jadwal Kerja dibandingkan dengan penjualan yang diharapkan.
_Avoid_: Labour cost

### Klinik

**Pasien**:
Orang yang berobat di klinik Tenant, dikenali lewat NIK dan Nomor Rekam Medis.
_Avoid_: Pelanggan, Klien

**NIK**:
Nomor Induk Kependudukan 16 digit yang wajib valid untuk mendaftarkan Pasien.
_Avoid_: KTP, ID pasien

**Nomor Rekam Medis**:
Nomor unik Pasien di dalam satu Tenant.
_Avoid_: MRN, No. RM sebagai istilah utama

**Antrean**:
Posisi seseorang menunggu di ruang tunggu klinik, atau reservasi Meja untuk usaha makan.
_Avoid_: Queue, Daftar tunggu

**Kunjungan**:
Satu episode pemeriksaan Pasien oleh Dokter, dari dimulai sampai ditutup; setelah ditutup terkunci.
_Avoid_: Visit, Konsultasi

**Rekam Medis Elektronik**:
Kumpulan catatan klinis Pasien: SOAP, odontogram, diagnosis, prosedur, dan resep.
_Avoid_: RME sebagai istilah pertama, EMR

**SOAP**:
Format catatan Kunjungan: keluhan, pemeriksaan, penilaian, rencana.
_Avoid_: Catatan dokter

**Odontogram**:
Peta gigi Pasien memakai penomoran FDI, berisi kondisi tiap gigi dan permukaannya.
_Avoid_: Dental chart, Peta gigi

**Diagnosis**:
Penilaian penyakit pada Kunjungan, dikodekan ICD-10.
_Avoid_: Penyakit

**Prosedur**:
Tindakan medis pada Kunjungan, dikodekan ICD-9-CM dan dapat dikaitkan ke Produk berbiaya.
_Avoid_: Tindakan tanpa kode, Treatment

**E-Resep**:
Resep obat elektronik dari Dokter yang bisa dibaca Staff untuk ditagihkan tanpa membuka SOAP.
_Avoid_: Resep (kosong; Resep berarti takaran Bahan)

**Signa**:
Aturan pakai obat pada sebuah E-Resep.
_Avoid_: Aturan minum

**Pembayaran Pasien**:
Penagihan Kunjungan dan obat menjadi sebuah Pesanan yang lalu dibayar.
_Avoid_: Tagihan (kosong; Tagihan Langganan berarti penagihan Platform)

**SATUSEHAT**:
Platform pertukaran data kesehatan Kemenkes tempat Kunjungan yang ditutup dilaporkan dalam format FHIR.
_Avoid_: Satu Sehat, Kemenkes sync

**Kiriman SATUSEHAT**:
Satu Kunjungan tertutup yang antre atau sudah dikirim ke SATUSEHAT; bisa berstatus simulasi bila kredensial belum ada.
_Avoid_: Outbox

### Wawasan, integrasi, dan AI

**Dashboard Eksekutif**:
Ringkasan penjualan, margin, dan kinerja Cabang untuk Owner dan GM.
_Avoid_: Beranda, Home

**KPI dan Target**:
Sasaran bulanan per Cabang beserta capaiannya.
_Avoid_: Goal

**Laporan Terjadwal**:
Ringkasan yang disusun dan dikirim otomatis pada hari dan jam tetap.
_Avoid_: Report otomatis

**Checklist Sesi Kas**:
Daftar tugas buka atau tutup yang diisi Staff pada Sesi Kas; bisa diwajibkan sebelum tutup.
_Avoid_: To-do kasir, Checklist shift

**Anomali**:
Pola pada Karyawan, seperti rasio void tinggi atau Selisih Kas berulang, yang ditandai untuk ditinjau.
_Avoid_: Kecurangan, Fraud

**Hermes**:
Agen pengirim pesan otomatis Harum.in ke WhatsApp dan Discord.
_Avoid_: Bot, Notifikasi

**Peristiwa Hermes**:
Satu pesan yang menunggu atau sudah dikirim Hermes, mis. laporan Z, stok menipis, peringatan void.
_Avoid_: Event notifikasi

**9router**:
Gerbang AI Harum.in yang meneruskan permintaan ke model bahasa.
_Avoid_: LLM proxy

**Owner Copilot**:
Asisten AI untuk Owner yang menjawab hanya dari angka ringkasan bisnis Tenant.
_Avoid_: Chatbot, Asisten AI umum

**Kuota AI**:
Batas token AI per bulan yang dimiliki sebuah Tenant menurut Paketnya.
_Avoid_: Limit AI
